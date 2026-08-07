/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// CartJS.Item
// Wraps a normal cart item JSON object to provide additional functionality.
// ---------------------


class Item {

  constructor(item) {
    this.update = this.update.bind(this);
    this.propertyArray = this.propertyArray.bind(this);
    this.update(item);
  }

  // Update this item in a way that doesn't destroy existing values.
  //
  // Implemented like this instead of a direct assignment to prevent interference with any data bindings.
  update(item) {
    for (var key in item) {
      var value = item[key];
      if (key !== 'properties') {
        this[key] = value;
      }
    }
    return this.properties = CartJS.Utils.extend({}, item.properties);
  }

  // Returns the properties of this item as an array of objects with name/value
  // properties. Useful when you'd like to iterate properties without knowing
  // in advance what they'll be.
  propertyArray() {
    return (() => {
      const result = [];
      for (var name in this.properties) {
        var value = this.properties[name];
        result.push({ name, value });
      }
      return result;
    })();
  }
}
