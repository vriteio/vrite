import { WhereOperand, createSearchContentHandler } from "../utils";
import { ObjectId } from "mongodb";

const deleteContent = createSearchContentHandler<{
  workspaceId: string | ObjectId;
  contentPieceId?: string | ObjectId | Array<string | ObjectId>;
  contentGroupId?: string | ObjectId;
  variantId?: string | ObjectId;
}>(async ({ client }, data) => {
  const batchDeleter = client.batch
    .objectsBatchDeleter()
    .withClassName("Content")
    .withTenant(`${data.workspaceId}`);
  const operands: Array<WhereOperand | { operator: "And" | "Or"; operands: WhereOperand[] }> = [];

  if (data.contentPieceId) {
    let contentPieceIds: Array<string | ObjectId> = [];

    if (Array.isArray(data.contentPieceId)) {
      contentPieceIds = data.contentPieceId;
    } else {
      contentPieceIds = [data.contentPieceId];
    }

    contentPieceIds.forEach((contentPieceId) => {
      if (data.variantId || data.contentGroupId) {
        const andOperand: { operator: "And" | "Or"; operands: WhereOperand[] } = {
          operator: "And",
          operands: [
            {
              path: ["contentPieceId"],
              operator: "Equal",
              valueText: `${contentPieceId}`
            }
          ]
        };

        if (data.variantId) {
          andOperand.operands.push({
            path: ["variantId"],
            operator: "Equal",
            valueText: `${data.variantId}`
          });
        }

        if (data.contentGroupId) {
          andOperand.operands.push({
            path: ["contentGroupIds"],
            operator: "ContainsAny",
            valueTextArray: [`${data.contentGroupId}`]
          });
        }

        operands.push(andOperand);
      } else {
        operands.push({
          path: ["contentPieceId"],
          operator: "Equal",
          valueText: `${contentPieceId}`
        });
      }
    });
  } else {
    const andOperands: WhereOperand[] = [];

    if (data.variantId) {
      andOperands.push({
        path: ["variantId"],
        operator: "Equal",
        valueText: `${data.variantId}`
      });
    }

    if (data.contentGroupId) {
      andOperands.push({
        path: ["contentGroupIds"],
        operator: "ContainsAny",
        valueTextArray: [`${data.contentGroupId}`]
      });
    }

    operands.push({
      operator: "And",
      operands: andOperands
    });
  }

  if (!operands.length) return;

  await batchDeleter.withWhere({ operator: "Or", operands }).do();
});

export { deleteContent };
