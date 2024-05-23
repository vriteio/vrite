/**
 * @module bindings/prosemirror
 */

import { createMutex } from "lib0/mutex";
import * as PModel from "@tiptap/pm/model";
import { Plugin, TextSelection } from "@tiptap/pm/state"; // eslint-disable-line
import * as math from "lib0/math";
import * as object from "lib0/object";
import * as set from "lib0/set";
import { simpleDiff } from "lib0/diff";
import * as error from "lib0/error";
import * as Y from "yjs";
import * as random from "lib0/random";
import * as environment from "lib0/environment";
import * as dom from "lib0/dom";
import * as eventloop from "lib0/eventloop";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
  yUndoPluginKey
} from "y-prosemirror";

/**
 * @param {Y.Item} item
 * @param {Y.Snapshot} [snapshot]
 */
export const isVisible = (item, snapshot) =>
  snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) &&
      /** @type {number} */
      snapshot.sv.get(item.id.client) > item.id.clock &&
      !Y.isDeleted(snapshot.ds, item.id);

/**
 * Either a node if type is YXmlElement or an Array of text nodes if YXmlText
 * @typedef {Map<Y.AbstractType<any>, PModel.Node | Array<PModel.Node>>} ProsemirrorMapping
 */

/**
 * @typedef {Object} ColorDef
 * @property {string} ColorDef.light
 * @property {string} ColorDef.dark
 */

/**
 * @typedef {Object} YSyncOpts
 * @property {Array<ColorDef>} [YSyncOpts.colors]
 * @property {Map<string,ColorDef>} [YSyncOpts.colorMapping]
 * @property {Y.PermanentUserData|null} [YSyncOpts.permanentUserData]
 * @property {function} [YSyncOpts.onFirstRender] Fired when the content from Yjs is initially rendered to ProseMirror
 */

/**
 * @type {Array<ColorDef>}
 */
const defaultColors = [{ light: "#ecd44433", dark: "#ecd444" }];
/**
 * @param {Map<string,ColorDef>} colorMapping
 * @param {Array<ColorDef>} colors
 * @param {string} user
 * @return {ColorDef}
 */
const getUserColor = (colorMapping, colors, user) => {
  // @todo do not hit the same color twice if possible
  if (!colorMapping.has(user)) {
    if (colorMapping.size < colors.length) {
      const usedColors = set.create();

      colorMapping.forEach((color) => usedColors.add(color));
      colors = colors.filter((color) => !usedColors.has(color));
    }

    colorMapping.set(user, random.oneOf(colors));
  }

  return /** @type {ColorDef} */ colorMapping.get(user);
};

/**
 * This plugin listens to changes in prosemirror view and keeps yXmlState and view in sync.
 *
 * This plugin also keeps references to the type and the shared document so other plugins can access it.
 * @param {Y.XmlFragment} yXmlFragment
 * @param {YSyncOpts} opts
 * @return {any} Returns a prosemirror plugin that binds to this type
 */
export const ySyncPlugin = (
  yXmlFragment,
  {
    colors = defaultColors,
    colorMapping = new Map(),
    permanentUserData = null,
    onFirstRender = () => {}
  } = {}
) => {
  let initialContentChanged = false;

  const plugin = new Plugin({
    props: {
      editable: (state) => {
        const syncState = ySyncPluginKey.getState(state);

        return syncState.snapshot == null && syncState.prevSnapshot == null;
      }
    },
    key: ySyncPluginKey,
    state: {
      init: (_initargs, _state) => {
        return {
          type: yXmlFragment,
          doc: yXmlFragment.doc,
          binding: null,
          snapshot: null,
          prevSnapshot: null,
          isChangeOrigin: false,
          isUndoRedoOperation: false,
          addToHistory: true,
          colors,
          colorMapping,
          permanentUserData
        };
      },
      apply: (tr, pluginState) => {
        const change = tr.getMeta(ySyncPluginKey);

        if (change !== undefined) {
          pluginState = { ...pluginState };

          for (const key in change) {
            pluginState[key] = change[key];
          }
        }

        pluginState.addToHistory = tr.getMeta("addToHistory") !== false;
        // always set isChangeOrigin. If undefined, this is not change origin.
        pluginState.isChangeOrigin = change !== undefined && !!change.isChangeOrigin;
        pluginState.isUndoRedoOperation =
          change !== undefined && !!change.isChangeOrigin && !!change.isUndoRedoOperation;

        if (pluginState.binding !== null) {
          if (change !== undefined && (change.snapshot != null || change.prevSnapshot != null)) {
            // snapshot changed, rerender next
            eventloop.timeout(0, () => {
              if (pluginState.binding == null || pluginState.binding.isDestroyed) {
                return;
              }

              if (change.restore == null) {
                pluginState.binding._renderSnapshot(
                  change.snapshot,
                  change.prevSnapshot,
                  pluginState
                );
              } else {
                pluginState.binding._renderSnapshot(change.snapshot, change.snapshot, pluginState);
                // reset to current prosemirror state
                delete pluginState.restore;
                delete pluginState.snapshot;
                delete pluginState.prevSnapshot;
                pluginState.binding.mux(() => {
                  pluginState.binding._prosemirrorChanged(
                    pluginState.binding.prosemirrorView.state.doc
                  );
                });
              }
            });
          }
        }

        return pluginState;
      }
    },
    view: (view) => {
      const binding = new ProsemirrorBinding(yXmlFragment, view);

      binding._forceRerender();
      onFirstRender();

      return {
        update: () => {
          const pluginState = plugin.getState(view.state);

          if (pluginState.snapshot == null && pluginState.prevSnapshot == null) {
            if (
              // If the content doesn't change initially, we don't render anything to Yjs
              // If the content was cleared by a user action, we want to catch the change and
              // represent it in Yjs
              initialContentChanged ||
              view.state.doc.content.findDiffStart(view.state.doc.type.createAndFill().content) !==
                null
            ) {
              initialContentChanged = true;

              if (pluginState.addToHistory === false && !pluginState.isChangeOrigin) {
                const yUndoPluginState = yUndoPluginKey.getState(view.state);
                /**
                 * @type {Y.UndoManager}
                 */
                const um = yUndoPluginState && yUndoPluginState.undoManager;

                if (um) {
                  um.stopCapturing();
                }
              }

              binding.mux(() => {
                pluginState.doc.transact((tr) => {
                  tr.meta.set("addToHistory", pluginState.addToHistory);
                  binding._prosemirrorChanged(view.state.doc);
                }, ySyncPluginKey);
              });
            }
          }
        },
        destroy: () => {
          binding.destroy();
        }
      };
    }
  });

  return plugin;
};

/**
 * @param {any} tr
 * @param {RecoverableSelection} recoverableSel
 * @param {ProsemirrorBinding} binding
 */
const restoreRelativeSelection = (tr, recoverableSel, binding) => {
  if (recoverableSel !== null && recoverableSel.valid()) {
    const selection = recoverableSel.restore(binding, tr.doc);

    tr = tr.setSelection(selection);
  }
};

export const getRelativeSelection = (pmbinding, state) => ({
  anchor: absolutePositionToRelativePosition(
    state.selection.anchor,
    pmbinding.type,
    pmbinding.mapping
  ),
  head: absolutePositionToRelativePosition(state.selection.head, pmbinding.type, pmbinding.mapping)
});
export const createRecoverableSelection = (pmbinding, state) => {
  const sel = new RecoverableSelection(pmbinding, state.selection);

  state.selection.map(state.doc, sel);

  return sel;
};
export class RecoverableSelection {
  constructor(pmbinding, selection, recoverMode = false) {
    this.records = [];
    this.pmbinding = pmbinding;
    this.selection = selection;
    this.recoverMode = recoverMode;
  }

  restore(pmbinding, doc) {
    return this.selection.map(doc, new RecoveryMapping(pmbinding, this.records));
  }

  valid() {
    return !!this.records.length && this.records.every((r) => r.relPos);
  }

  map(pos) {
    const relPos = absolutePositionToRelativePosition(
      pos,
      this.pmbinding.type,
      this.pmbinding.mapping
    );

    this.records.push({ pos, relPos });

    return pos;
  }

  mapResult(pos) {
    return { deleted: false, pos: this.map(pos) };
  }
}
export class RecoveryMapping {
  constructor(pmbinding, records) {
    this.pmbinding = pmbinding;
    this.records = records;
  }

  map(pos) {
    return this.mapResult(pos).pos;
  }

  mapResult(pos) {
    for (const rec of this.records) {
      if (rec.pos === pos) {
        const mappedPos = relativePositionToAbsolutePosition(
          this.pmbinding.doc,
          this.pmbinding.type,
          rec.relPos,
          this.pmbinding.mapping
        );

        if (mappedPos === null) {
          return { deleted: true, pos };
        }

        return { deleted: false, pos: mappedPos };
      }
    }

    throw new Error("not recorded");
  }
}
/**
 * Binding for prosemirror.
 *
 * @protected
 */
export class ProsemirrorBinding {
  /**
   * @param {Y.XmlFragment} yXmlFragment The bind source
   * @param {any} prosemirrorView The target binding
   */
  constructor(yXmlFragment, prosemirrorView) {
    this.type = yXmlFragment;
    this.prosemirrorView = prosemirrorView;
    this.mux = createMutex();
    this.isDestroyed = false;
    /**
     * @type {ProsemirrorMapping}
     */
    this.mapping = new Map();
    this._observeFunction = this._typeChanged.bind(this);
    /**
     * @type {Y.Doc}
     */
    // @ts-ignore
    this.doc = yXmlFragment.doc;
    /**
     * current selection as relative positions in the Yjs model
     */
    this.beforeTransactionSelection = null;
    this.beforeAllTransactions = () => {
      if (this.beforeTransactionSelection === null) {
        this.beforeTransactionSelection = createRecoverableSelection(this, prosemirrorView.state);
      }
    };
    this.afterAllTransactions = () => {
      this.beforeTransactionSelection = null;
    };
    this.doc.on("beforeAllTransactions", this.beforeAllTransactions);
    this.doc.on("afterAllTransactions", this.afterAllTransactions);
    yXmlFragment.observeDeep(this._observeFunction);
    this._domSelectionInView = null;
  }

  /**
   * Create a transaction for changing the prosemirror state.
   *
   * @returns
   */
  get _tr() {
    return this.prosemirrorView.state.tr.setMeta("addToHistory", false);
  }

  _isLocalCursorInView() {
    if (!this.prosemirrorView.hasFocus()) return false;

    if (environment.isBrowser && this._domSelectionInView === null) {
      // Calculate the domSelectionInView and clear by next tick after all events are finished
      eventloop.timeout(0, () => {
        this._domSelectionInView = null;
      });
      this._domSelectionInView = this._isDomSelectionInView();
    }

    return this._domSelectionInView;
  }

  _isDomSelectionInView() {
    const selection = this.prosemirrorView._root.getSelection();
    const range = this.prosemirrorView._root.createRange();

    range.setStart(selection.anchorNode, selection.anchorOffset);
    range.setEnd(selection.focusNode, selection.focusOffset);

    /* This is a workaround for an edgecase where getBoundingClientRect will
       return zero values if the selection is collapsed at the start of a newline
       see reference here: https://stackoverflow.com/a/59780954 */
    const rects = range.getClientRects();

    if (rects.length === 0) {
      // probably buggy newline behavior, explicitly select the node contents
      if (range.startContainer && range.collapsed) {
        range.selectNodeContents(range.startContainer);
      }
    }

    const bounding = range.getBoundingClientRect();
    const { documentElement } = dom.doc;

    return (
      bounding.bottom >= 0 &&
      bounding.right >= 0 &&
      bounding.left <= (window.innerWidth || documentElement.clientWidth || 0) &&
      bounding.top <= (window.innerHeight || documentElement.clientHeight || 0)
    );
  }

  renderSnapshot(snapshot, prevSnapshot) {
    if (!prevSnapshot) {
      prevSnapshot = Y.createSnapshot(Y.createDeleteSet(), new Map());
    }

    this.prosemirrorView.dispatch(this._tr.setMeta(ySyncPluginKey, { snapshot, prevSnapshot }));
  }

  unrenderSnapshot() {
    this.mapping = new Map();
    this.mux(() => {
      const fragmentContent = this.type
        .toArray()
        .map((t) =>
          createNodeFromYElement(
            /** @type {Y.XmlElement} */ t,
            this.prosemirrorView.state.schema,
            this.mapping
          )
        )
        .filter((n) => n !== null);
      // @ts-ignore
      const tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      );

      tr.setMeta(ySyncPluginKey, { snapshot: null, prevSnapshot: null });
      this.prosemirrorView.dispatch(tr);
    });
  }

  _forceRerender() {
    this.mapping = new Map();
    this.mux(() => {
      const fragmentContent = this.type
        .toArray()
        .map((t) =>
          createNodeFromYElement(
            /** @type {Y.XmlElement} */ t,
            this.prosemirrorView.state.schema,
            this.mapping
          )
        )
        .filter((n) => n !== null);
      // @ts-ignore
      const tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      );

      this.prosemirrorView.dispatch(
        tr.setMeta(ySyncPluginKey, { isChangeOrigin: true, binding: this })
      );
    });
  }

  /**
   * @param {Y.Snapshot} snapshot
   * @param {Y.Snapshot} prevSnapshot
   * @param {Object} pluginState
   */
  _renderSnapshot(snapshot, prevSnapshot, pluginState) {
    if (!snapshot) {
      snapshot = Y.snapshot(this.doc);
    }

    // clear mapping because we are going to rerender
    this.mapping = new Map();
    this.mux(() => {
      this.doc.transact((transaction) => {
        /* before rendering, we are going to sanitize ops and split deleted ops
           if they were deleted by seperate users. */
        const pud = pluginState.permanentUserData;

        if (pud) {
          pud.dss.forEach((ds) => {
            Y.iterateDeletedStructs(transaction, ds, (_item) => {});
          });
        }

        /**
         * @param {'removed'|'added'} type
         * @param {Y.ID} id
         */
        const computeYChange = (type, id) => {
          const user =
            type === "added" ? pud.getUserByClientId(id.client) : pud.getUserByDeletedId(id);

          return {
            user,
            type,
            color: getUserColor(pluginState.colorMapping, pluginState.colors, user)
          };
        };
        // Create document fragment and render
        const fragmentContent = Y.typeListToArraySnapshot(
          this.type,
          new Y.Snapshot(prevSnapshot.ds, snapshot.sv)
        )
          .map((t) => {
            if (
              !t._item.deleted ||
              isVisible(t._item, snapshot) ||
              isVisible(t._item, prevSnapshot)
            ) {
              return createNodeFromYElement(
                t,
                this.prosemirrorView.state.schema,
                new Map(),
                snapshot,
                prevSnapshot,
                computeYChange
              );
            } else {
              /* No need to render elements that are not visible by either snapshot.
               If a client adds and deletes content in the same snapshot the element is not visible by either snapshot. */
              return null;
            }
          })
          .filter((n) => n !== null);
        // @ts-ignore
        const tr = this._tr.replace(
          0,
          this.prosemirrorView.state.doc.content.size,
          new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
        );

        this.prosemirrorView.dispatch(tr.setMeta(ySyncPluginKey, { isChangeOrigin: true }));
      }, ySyncPluginKey);
    });
  }

  /**
   * @param {Array<Y.YEvent<any>>} events
   * @param {Y.Transaction} transaction
   */
  _typeChanged(events, transaction) {
    const syncState = ySyncPluginKey.getState(this.prosemirrorView.state);

    if (events.length === 0 || syncState.snapshot != null || syncState.prevSnapshot != null) {
      // drop out if snapshot is active
      this.renderSnapshot(syncState.snapshot, syncState.prevSnapshot);

      return;
    }

    this.mux(() => {
      /**
       * @param {any} _
       * @param {Y.AbstractType<any>} type
       */
      const delType = (_, type) => this.mapping.delete(type);

      Y.iterateDeletedStructs(transaction, transaction.deleteSet, (struct) => {
        if (struct.constructor === Y.Item) {
          const type = /** @type {Y.ContentType} */ (/** @type {Y.Item} */ (struct).content).type;
          type && this.mapping.delete(type);
        }
      });
      transaction.changed.forEach(delType);
      transaction.changedParentTypes.forEach(delType);

      const fragmentContent = this.type
        .toArray()
        .map((t) =>
          createNodeIfNotExists(
            /** @type {Y.XmlElement | Y.XmlHook} */ t,
            this.prosemirrorView.state.schema,
            this.mapping
          )
        )
        .filter((n) => n !== null);

      // @ts-ignore
      let tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      );

      restoreRelativeSelection(tr, this.beforeTransactionSelection, this);
      tr = tr.setMeta(ySyncPluginKey, {
        isChangeOrigin: true,
        isUndoRedoOperation: transaction.origin instanceof Y.UndoManager
      });

      if (
        this.beforeTransactionSelection !== null &&
        this._isLocalCursorInView() &&
        this.beforeTransactionSelection instanceof RecoverableSelection &&
        this.beforeTransactionSelection.selection instanceof TextSelection
      ) {
        tr.scrollIntoView();
      }

      this.prosemirrorView.dispatch(tr);
    });
  }

  _prosemirrorChanged(doc) {
    this.doc.transact((tr) => {
      updateYFragment(this.doc, this.type, doc, this.mapping);
      this.beforeTransactionSelection = createRecoverableSelection(
        this,
        this.prosemirrorView.state
      );
    }, ySyncPluginKey);
  }

  destroy() {
    this.isDestroyed = true;
    this.type.unobserveDeep(this._observeFunction);
    this.doc.off("beforeAllTransactions", this.beforeAllTransactions);
    this.doc.off("afterAllTransactions", this.afterAllTransactions);
  }
}

/**
 * @private
 * @param {Y.XmlElement | Y.XmlHook} el
 * @param {PModel.Schema} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {PModel.Node | null}
 */
const createNodeIfNotExists = (el, schema, mapping, snapshot, prevSnapshot, computeYChange) => {
  const node = /** @type {PModel.Node} */ mapping.get(el);

  if (node === undefined) {
    if (el instanceof Y.XmlElement) {
      return createNodeFromYElement(el, schema, mapping, snapshot, prevSnapshot, computeYChange);
    } else {
      throw error.methodUnimplemented(); // we are currently not handling hooks
    }
  }

  return node;
};
/**
 * @private
 * @param {Y.XmlElement} el
 * @param {any} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {PModel.Node | null} Returns node if node could be created. Otherwise it deletes the yjs type and returns null
 */
export const createNodeFromYElement = (
  el,
  schema,
  mapping,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const children = [];
  const createChildren = (type) => {
    if (type.constructor === Y.XmlElement) {
      const n = createNodeIfNotExists(
        type,
        schema,
        mapping,
        snapshot,
        prevSnapshot,
        computeYChange
      );

      if (n !== null) {
        children.push(n);
      }
    } else {
      const ns = createTextNodesFromYText(
        type,
        schema,
        mapping,
        snapshot,
        prevSnapshot,
        computeYChange
      );

      if (ns !== null) {
        ns.forEach((textchild) => {
          if (textchild !== null) {
            children.push(textchild);
          }
        });
      }
    }
  };

  if (snapshot === undefined || prevSnapshot === undefined) {
    el.toArray().forEach(createChildren);
  } else {
    Y.typeListToArraySnapshot(el, new Y.Snapshot(prevSnapshot.ds, snapshot.sv)).forEach(
      createChildren
    );
  }

  try {
    const attrs = el.getAttributes(snapshot);

    if (snapshot !== undefined) {
      if (!isVisible(/** @type {Y.Item} */ el._item, snapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange("removed", /** @type {Y.Item} */ el._item.id)
          : { type: "removed" };
      } else if (!isVisible(/** @type {Y.Item} */ el._item, prevSnapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange("added", /** @type {Y.Item} */ el._item.id)
          : { type: "added" };
      }
    }

    const node = schema.node(el.nodeName, attrs, children);

    mapping.set(el, node);

    return node;
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    /** @type {Y.Doc} */ el.doc.transact((transaction) => {
      /** @type {Y.Item} */ el._item.delete(transaction);
    }, ySyncPluginKey);
    mapping.delete(el);

    return null;
  }
};
/**
 * @private
 * @param {Y.XmlText} text
 * @param {any} schema
 * @param {ProsemirrorMapping} mapping
 * @param {Y.Snapshot} [snapshot]
 * @param {Y.Snapshot} [prevSnapshot]
 * @param {function('removed' | 'added', Y.ID):any} [computeYChange]
 * @return {Array<PModel.Node>|null}
 */
const createTextNodesFromYText = (
  text,
  schema,
  mapping,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const nodes = [];
  const deltas = text.toDelta(snapshot, prevSnapshot, computeYChange);

  try {
    for (let i = 0; i < deltas.length; i++) {
      const delta = deltas[i];
      const marks = [];

      for (const markName in delta.attributes) {
        marks.push(schema.mark(markName, delta.attributes[markName]));
      }

      nodes.push(schema.text(delta.insert, marks));
    }
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    /** @type {Y.Doc} */ text.doc.transact((transaction) => {
      /** @type {Y.Item} */ text._item.delete(transaction);
    }, ySyncPluginKey);

    return null;
  }

  // @ts-ignore
  return nodes;
};
/**
 * @private
 * @param {Array<any>} nodes prosemirror node
 * @param {ProsemirrorMapping} mapping
 * @return {Y.XmlText}
 */
const createTypeFromTextNodes = (nodes, mapping) => {
  const type = new Y.XmlText();
  const delta = nodes.map((node) => ({
    // @ts-ignore
    insert: node.text,
    attributes: marksToAttributes(node.marks)
  }));

  type.applyDelta(delta);
  mapping.set(type, nodes);

  return type;
};
/**
 * @private
 * @param {any} node prosemirror node
 * @param {ProsemirrorMapping} mapping
 * @return {Y.XmlElement}
 */
const createTypeFromElementNode = (node, mapping) => {
  const type = new Y.XmlElement(node.type.name);

  for (const key in node.attrs) {
    const val = node.attrs[key];

    if (val !== null && key !== "ychange") {
      type.setAttribute(key, val);
    }
  }

  type.insert(
    0,
    normalizePNodeContent(node).map((n) => createTypeFromTextOrElementNode(n, mapping))
  );
  mapping.set(type, node);

  return type;
};
/**
 * @private
 * @param {PModel.Node|Array<PModel.Node>} node prosemirror text node
 * @param {ProsemirrorMapping} mapping
 * @return {Y.XmlElement|Y.XmlText}
 */
const createTypeFromTextOrElementNode = (node, mapping) =>
  node instanceof Array
    ? createTypeFromTextNodes(node, mapping)
    : createTypeFromElementNode(node, mapping);
const isObject = (val) => typeof val === "object" && val !== null;
const equalAttrs = (pattrs, yattrs) => {
  const keys = Object.keys(pattrs).filter((key) => pattrs[key] !== null);

  let eq = keys.length === Object.keys(yattrs).filter((key) => yattrs[key] !== null).length;

  for (let i = 0; i < keys.length && eq; i++) {
    const key = keys[i];
    const l = pattrs[key];
    const r = yattrs[key];

    eq = key === "ychange" || l === r || (isObject(l) && isObject(r) && equalAttrs(l, r));
  }

  return eq;
};

/**
 * @typedef {Array<Array<PModel.Node>|PModel.Node>} NormalizedPNodeContent
 */

/**
 * @param {any} pnode
 * @return {NormalizedPNodeContent}
 */
const normalizePNodeContent = (pnode) => {
  const c = pnode.content.content;
  const res = [];

  for (let i = 0; i < c.length; i++) {
    const n = c[i];

    if (n.isText) {
      const textNodes = [];

      for (let tnode = c[i]; i < c.length && tnode.isText; tnode = c[++i]) {
        textNodes.push(tnode);
      }

      i--;
      res.push(textNodes);
    } else {
      res.push(n);
    }
  }

  return res;
};
/**
 * @param {Y.XmlText} ytext
 * @param {Array<any>} ptexts
 */
const equalYTextPText = (ytext, ptexts) => {
  const delta = ytext.toDelta();

  return (
    delta.length === ptexts.length &&
    delta.every(
      (d, i) =>
        d.insert === /** @type {any} */ ptexts[i].text &&
        object.keys(d.attributes || {}).length === ptexts[i].marks.length &&
        ptexts[i].marks.every((mark) => equalAttrs(d.attributes[mark.type.name] || {}, mark.attrs))
    )
  );
};
/**
 * @param {Y.XmlElement|Y.XmlText|Y.XmlHook} ytype
 * @param {any|Array<any>} pnode
 */
const equalYTypePNode = (ytype, pnode) => {
  if (ytype instanceof Y.XmlElement && !(pnode instanceof Array) && matchNodeName(ytype, pnode)) {
    const normalizedContent = normalizePNodeContent(pnode);

    return (
      ytype._length === normalizedContent.length &&
      equalAttrs(ytype.getAttributes(), pnode.attrs) &&
      ytype.toArray().every((ychild, i) => equalYTypePNode(ychild, normalizedContent[i]))
    );
  }

  return ytype instanceof Y.XmlText && pnode instanceof Array && equalYTextPText(ytype, pnode);
};
/**
 * @param {PModel.Node | Array<PModel.Node> | undefined} mapped
 * @param {PModel.Node | Array<PModel.Node>} pcontent
 */
const mappedIdentity = (mapped, pcontent) =>
  mapped === pcontent ||
  (mapped instanceof Array &&
    pcontent instanceof Array &&
    mapped.length === pcontent.length &&
    mapped.every((a, i) => pcontent[i] === a));
/**
 * @param {Y.XmlElement} ytype
 * @param {PModel.Node} pnode
 * @param {ProsemirrorMapping} mapping
 * @return {{ foundMappedChild: boolean, equalityFactor: number }}
 */
const computeChildEqualityFactor = (ytype, pnode, mapping) => {
  const yChildren = ytype.toArray();
  const pChildren = normalizePNodeContent(pnode);
  const pChildCnt = pChildren.length;
  const yChildCnt = yChildren.length;
  const minCnt = math.min(yChildCnt, pChildCnt);

  let left = 0;
  let right = 0;
  let foundMappedChild = false;

  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];

    if (mappedIdentity(mapping.get(leftY), leftP)) {
      foundMappedChild = true; // definite (good) match!
    } else if (!equalYTypePNode(leftY, leftP)) {
      break;
    }
  }

  for (; left + right < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];

    if (mappedIdentity(mapping.get(rightY), rightP)) {
      foundMappedChild = true;
    } else if (!equalYTypePNode(rightY, rightP)) {
      break;
    }
  }

  return {
    equalityFactor: left + right,
    foundMappedChild
  };
};
const ytextTrans = (ytext) => {
  let str = "";
  /**
   * @type {Y.Item|null}
   */
  let n = ytext._start;

  const nAttrs = {};

  while (n !== null) {
    if (!n.deleted) {
      if (n.countable && n.content instanceof Y.ContentString) {
        str += n.content.str;
      } else if (n.content instanceof Y.ContentFormat) {
        nAttrs[n.content.key] = null;
      }
    }

    n = n.right;
  }

  return {
    str,
    nAttrs
  };
};
/**
 * @todo test this more
 *
 * @param {Y.Text} ytext
 * @param {Array<any>} ptexts
 * @param {ProsemirrorMapping} mapping
 */
const updateYText = (ytext, ptexts, mapping) => {
  mapping.set(ytext, ptexts);

  const { nAttrs, str } = ytextTrans(ytext);
  const content = ptexts.map((p) => ({
    insert: /** @type {any} */ p.text,
    attributes: { ...nAttrs, ...marksToAttributes(p.marks) }
  }));
  const { insert, remove, index } = simpleDiff(str, content.map((c) => c.insert).join(""));

  ytext.delete(index, remove);
  ytext.insert(index, insert);
  ytext.applyDelta(content.map((c) => ({ retain: c.insert.length, attributes: c.attributes })));
};
const marksToAttributes = (marks) => {
  const pattrs = {};

  marks.forEach((mark) => {
    if (mark.type.name !== "ychange") {
      pattrs[mark.type.name] = mark.attrs;
    }
  });

  return pattrs;
};

/**
 * Update a yDom node by syncing the current content of the prosemirror node.
 *
 * This is a y-prosemirror internal feature that you can use at your own risk.
 *
 * @private
 * @unstable
 *
 * @param {{transact: Function}} y
 * @param {Y.XmlFragment} yDomFragment
 * @param {any} pNode
 * @param {ProsemirrorMapping} mapping
 */
export const updateYFragment = (y, yDomFragment, pNode, mapping) => {
  if (yDomFragment instanceof Y.XmlElement && yDomFragment.nodeName !== pNode.type.name) {
    throw new Error("node name mismatch!");
  }

  mapping.set(yDomFragment, pNode);

  // update attributes
  if (yDomFragment instanceof Y.XmlElement) {
    const yDomAttrs = yDomFragment.getAttributes();
    const pAttrs = pNode.attrs;

    for (const key in pAttrs) {
      if (pAttrs[key] !== null) {
        if (yDomAttrs[key] !== pAttrs[key] && key !== "ychange") {
          yDomFragment.setAttribute(key, pAttrs[key]);
        }
      } else {
        yDomFragment.removeAttribute(key);
      }
    }

    // remove all keys that are no longer in pAttrs
    for (const key in yDomAttrs) {
      if (pAttrs[key] === undefined) {
        yDomFragment.removeAttribute(key);
      }
    }
  }

  // update children
  const pChildren = normalizePNodeContent(pNode);
  const pChildCnt = pChildren.length;
  const yChildren = yDomFragment.toArray();
  const yChildCnt = yChildren.length;
  const minCnt = math.min(pChildCnt, yChildCnt);

  let left = 0;
  let right = 0;

  // find number of matching elements from left
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];

    if (!mappedIdentity(mapping.get(leftY), leftP)) {
      if (equalYTypePNode(leftY, leftP)) {
        // update mapping
        mapping.set(leftY, leftP);
      } else {
        break;
      }
    }
  }

  // find number of matching elements from right
  for (; right + left + 1 < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];

    if (!mappedIdentity(mapping.get(rightY), rightP)) {
      if (equalYTypePNode(rightY, rightP)) {
        // update mapping
        mapping.set(rightY, rightP);
      } else {
        break;
      }
    }
  }

  y.transact(() => {
    // try to compare and update
    while (yChildCnt - left - right > 0 && pChildCnt - left - right > 0) {
      const leftY = yChildren[left];
      const leftP = pChildren[left];
      const rightY = yChildren[yChildCnt - right - 1];
      const rightP = pChildren[pChildCnt - right - 1];

      if (leftY instanceof Y.XmlText && leftP instanceof Array) {
        if (!equalYTextPText(leftY, leftP)) {
          updateYText(leftY, leftP, mapping);
        }

        left += 1;
      } else {
        let updateLeft = leftY instanceof Y.XmlElement && matchNodeName(leftY, leftP);
        let updateRight = rightY instanceof Y.XmlElement && matchNodeName(rightY, rightP);

        if (updateLeft && updateRight) {
          // decide which which element to update
          const equalityLeft = computeChildEqualityFactor(
            /** @type {Y.XmlElement} */ leftY,
            /** @type {PModel.Node} */ leftP,
            mapping
          );
          const equalityRight = computeChildEqualityFactor(
            /** @type {Y.XmlElement} */ rightY,
            /** @type {PModel.Node} */ rightP,
            mapping
          );

          if (equalityLeft.foundMappedChild && !equalityRight.foundMappedChild) {
            updateRight = false;
          } else if (!equalityLeft.foundMappedChild && equalityRight.foundMappedChild) {
            updateLeft = false;
          } else if (equalityLeft.equalityFactor < equalityRight.equalityFactor) {
            updateLeft = false;
          } else {
            updateRight = false;
          }
        }

        if (updateLeft) {
          updateYFragment(
            y,
            /** @type {Y.XmlFragment} */ leftY,
            /** @type {PModel.Node} */ leftP,
            mapping
          );
          left += 1;
        } else if (updateRight) {
          updateYFragment(
            y,
            /** @type {Y.XmlFragment} */ rightY,
            /** @type {PModel.Node} */ rightP,
            mapping
          );
          right += 1;
        } else {
          mapping.delete(yDomFragment.get(left));
          yDomFragment.delete(left, 1);
          yDomFragment.insert(left, [createTypeFromTextOrElementNode(leftP, mapping)]);
          left += 1;
        }
      }
    }

    const yDelLen = yChildCnt - left - right;

    if (yChildCnt === 1 && pChildCnt === 0 && yChildren[0] instanceof Y.XmlText) {
      mapping.delete(yChildren[0]);
      /* Edge case handling https://github.com/yjs/y-prosemirror/issues/108
         Only delete the content of the Y.Text to retain remote changes on the same Y.Text object */
      yChildren[0].delete(0, yChildren[0].length);
    } else if (yDelLen > 0) {
      yDomFragment.slice(left, left + yDelLen).forEach((type) => mapping.delete(type));
      yDomFragment.delete(left, yDelLen);
    }

    if (left + right < pChildCnt) {
      const ins = [];

      for (let i = left; i < pChildCnt - right; i++) {
        ins.push(createTypeFromTextOrElementNode(pChildren[i], mapping));
      }

      yDomFragment.insert(left, ins);
    }
  }, ySyncPluginKey);
};

/**
 * @function
 * @param {Y.XmlElement} yElement
 * @param {any} pNode Prosemirror Node
 */
const matchNodeName = (yElement, pNode) =>
  !(pNode instanceof Array) && yElement.nodeName === pNode.type.name;
