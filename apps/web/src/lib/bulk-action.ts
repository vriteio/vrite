interface BulkActionSuccess<Item, Value> {
  item: Item;
  value: Value;
}

interface BulkActionFailure<Item> {
  error: unknown;
  item: Item;
}

interface BulkActionResult<Item, Value> {
  failed: BulkActionFailure<Item>[];
  successful: BulkActionSuccess<Item, Value>[];
}

const settleBulkAction = async <Item, Value>(
  items: Item[],
  action: (item: Item) => Promise<Value>
): Promise<BulkActionResult<Item, Value>> => {
  const results = await Promise.allSettled(items.map(async (item) => action(item)));
  const settled: BulkActionResult<Item, Value> = { failed: [], successful: [] };

  results.forEach((result, index) => {
    const item = items[index];

    if (result.status === "fulfilled") {
      settled.successful.push({ item, value: result.value });
    } else {
      settled.failed.push({ error: result.reason, item });
    }
  });

  return settled;
};

export { settleBulkAction };
export type { BulkActionFailure, BulkActionResult, BulkActionSuccess };
