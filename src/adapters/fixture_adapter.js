/**
  The FixtureAdapter is used for working with predefined
  javascript data stored in memory.

  @class FixtureAdapter
  @beta
  @namespace RESTless
  @extends RESTless.Adapter
*/
RESTless.FixtureAdapter = RESTless.Adapter.extend({

  serializer: RESTless.JSONSerializer.create(),

  /**
    Saves a record. Pushes a new record to fixtures, or updates an existing record.
    @method saveRecord
    @param {RESTless.Model} record record to be saved
    @return {Ember.RSVP.Promise}
   */
  saveRecord: function(record) {
    var isNew = record.get('isNew'),
        fixtures = record.constructor.FIXTURES,
        primaryKey = get(record.constructor, 'primaryKey'),
        adapter = this, serializedRecord;

    if(!isNew && !record.get('isDirty')) {
      return new Ember.RSVP.Promise(function(resolve, reject){
        resolve(record);
      });
    }

    record.set('isSaving', true);

    // If no fixtures for class, create
    if(!fixtures) {
      record.constructor.FIXTURES = fixtures = [];
    }

    // assign a guid for new records
    if(Ember.isNone(record.get(primaryKey))) {
      record.set(primaryKey, this.generateIdForRecord(record));
    }

    // serialize a to a flat record and include relationship data
    serializedRecord = record.serialize({ nonEmbedded: true, includeRelationships: true });

    return new Ember.RSVP.Promise(function(resolve, reject){
      if(isNew) {
        // Push new records onto fixtures array
        fixtures.push(serializedRecord);
        record.onSaved(true);
        resolve(record);
      } else {
        // update existing record
        var index = adapter._findFixtureRecordIndex(record);
        if(index !== -1) {
          fixtures[index] = serializedRecord;
          record.onSaved(false);
          resolve(record);
        } else {
          record.onError();
          reject(null);
        }
      }
    });
  },

  /**
    Deletes a record from fixtures array
    @method deleteRecord
    @param {RESTless.Model} record record to be deleted
    @return {Ember.RSVP.Promise}
   */
  deleteRecord: function(record) {
    var adapter = this;
    return new Ember.RSVP.Promise(function(resolve, reject){
      if(!record.constructor.FIXTURES) {
        record.onError();
        reject(null);
      }
      var index = adapter._findFixtureRecordIndex(record);
      if(index !== -1) {
        record.constructor.FIXTURES.splice(index, 1);
        record.onDeleted();
        resolve(record);
      } else {
        record.onError();
        reject(null);
      }
    });
  },

  /**
    Finds all records of specified class in fixtures array
    @method findAll
    @param {RESTless.Model} klass model type to find
    @return {RESTless.RecordArray}
   */
  findAll: function(klass) {
    return this.findQuery(klass);
  },

  /**
    Finds records with specified query params in fixtures array
    @method findQuery
    @param {RESTless.Model} klass model type to find
    @param {Object} queryParams hash of query params
    @return {RESTless.RecordArray}
   */
  findQuery: function(klass, queryParams) {
    var fixtures = klass.FIXTURES,
        result = null, fixturesA;

    if(!fixtures) {
      return result;
    }

    fixturesA = Ember.A(fixtures);
    if(queryParams) {
      fixturesA = fixturesA.filter(function(item, index, enumerable) {
        for(var key in queryParams) {
          if(queryParams.hasOwnProperty(key) && item[key] !== queryParams[key]) {
            return false;
          }
        }
        return true;
      });
    }
    
    result = RESTless.RecordArray.createWithContent();
    result.deserializeMany(klass.toString(), fixturesA);
    result.onLoaded();
    return result;
  },

  /**
    Finds record with specified primary key in fixtures
    @method findByKey
    @param {RESTless.Model} klass model type to find
    @param {Number|String} key primary key value
    @return {RESTless.Model}
   */
  findByKey: function(klass, key) {
    var fixtures = klass.FIXTURES,
        primaryKey = get(klass, 'primaryKey'),
        result = null, keyAsString, fixtureRecord;

    if(!fixtures) {
      return result;
    }

    keyAsString = key.toString();
    fixtureRecord = Ember.A(fixtures).find(function(r) {
      return r[primaryKey].toString() === keyAsString;
    });
    if(fixtureRecord) {
      result = klass.create({ isNew: false });
      result.deserialize(fixtureRecord);
      result.onLoaded();
    }
    return result;
  },

  /**
    Generates a uuid for a new record.
    @method generateIdForRecord
    @param {Object} record
    @return {String} uuid
  */
  generateIdForRecord: function(record) {
    return parseInt(Ember.guidFor(record).match(/(\d+)$/)[0], 10);
  },

  /**
    @method _findFixtureRecordIndex
    @private
  */
  _findFixtureRecordIndex: function(record) {
    var klass = record.constructor,
        fixtures = klass.FIXTURES,
        primaryKey = get(klass, 'primaryKey'), fixtureRecord;
    if(fixtures) {
      fixtureRecord = fixtures.findProperty(primaryKey, record.get(primaryKey));
      return fixtures.indexOf(fixtureRecord);
    }
    return -1;
  }
});
