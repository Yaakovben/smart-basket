/**
 * Helper to check if a string looks like a MongoDB ObjectId
 */
export const isObjectIdString = (str: string): boolean => {
  return /^[a-f\d]{24}$/i.test(str);
};

/**
 * Helper to convert addedBy from object/ObjectId to string (name)
 */
export const convertProductsAddedBy = (products: Record<string, unknown>[]): Record<string, unknown>[] => {
  return products.map((p) => {
    let addedByName: string;

    if (typeof p.addedBy === 'object' && p.addedBy !== null) {
      // Populated user object - extract name
      addedByName = (p.addedBy as { name?: string }).name || 'Unknown';
    } else if (typeof p.addedBy === 'string') {
      // Otherwise, assume it's already a name
      addedByName = isObjectIdString(p.addedBy) ? 'Unknown' : p.addedBy;
    } else {
      addedByName = 'Unknown';
    }

    return { ...p, addedBy: addedByName };
  });
};
