/**
 * Recursively traverses an object and converts any Firestore Timestamps 
 * to Redux-friendly serializable ISO strings.
 * 
 * @param data - The object or array to serialize
 * @returns Serialized data
 */
export function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Firestore Timestamps
  // In the web SDK, Timestamps have a toDate() method
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  // Handle objects with seconds and nanoseconds (might happen in some serializations)
  if (
    typeof data === 'object' &&
    data !== null &&
    'seconds' in data &&
    'nanoseconds' in data &&
    Object.keys(data).length === 2
  ) {
    return new Date(data.seconds * 1000).toISOString();
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  // Handle Objects
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializeFirestoreData(data[key]);
      }
    }
    return result;
  }

  // Return primitive values
  return data;
}
