sap.ui.define([
  "sap/ui/base/Object"
], function (UI5Object) {
  "use strict";

  return UI5Object.extend("com.dhi.cms.cmsrequester.util.transaction.ContractHandler", {
    constructor: function (oModel) {
      this.batchId = "contracts";
      this.model = null;
      this.entityName = "Contracts";
      this.associations = {
        attribute_values: "attribute_values",
        attachments: "attachments",
        templates: "templates",
        // add other associations you need
      };
      this.isBound = false;
      this.activeContext = null;
      this.attributeDataFetchedMap = {};
    },

    initializeBinding: function (oModel, oController) {
      this.controller = oController;
      this.model = oModel;
      // Bind the collection with expands you need for lists
      this.contractBinding = this.model.bindList(
        `/${this.entityName}`,
        null,
        [], [], {
          $expand: "templates,attribute_values,attachments",
          $$updateGroupId: this.batchId
        }
      );
      this.isBound = true;
    },

    resetAttributeFetchState: function () {
      this.attributeDataFetchedMap = {};
      this.attributeValues = null;
      this.resetContractAttributes = true;
    },

    createNewContract: function (initialPayload) {
      // reset batch changes for this group
      this.model.resetChanges(this.batchId);

      // create a transient contract with defaults
      this.createContext = this.contractBinding.create(Object.assign({
        alias: "",
        contract_id: "",
        name: "",
        description: "",
        start_date: null,
        end_date: null,
        status: "Draft",
        templates_ID: null
      }, initialPayload || {}), {
        $$updateGroupId: this.batchId
      });

      this.activeContext = this.createContext;

      // create bound lists for associations
      this.attributeValues = this.model.bindList(
        `${this.associations.attribute_values}`,
        this.activeContext, [], [], { $$updateGroupId: this.batchId }
      );

      this.assetBinding = this.model.bindList(
        `${this.associations.attachments}`,
        this.activeContext, [], [], { $$updateGroupId: this.batchId }
      );

      return this.createContext;
    },

    getExistingContract: function (sContractId) {
      // returns a promise that resolves with the context
      return new Promise((resolve, reject) => {
        let context = this.getContractContext(sContractId);
        if (!context) { return reject(new Error("Context not found")); }

        if (context.isTransient && context.isTransient()) {
          return reject(new Error("Context is transient/unready"));
        }

        context.requestObject()
          .then(() => {
            this.activeContext = context;
            // create association bindings for current context
            this._ensureAssociationBindings();
            resolve(context);
          })
          .catch(reject);
      });
    },

    _ensureAssociationBindings: function () {
      if (!this.attributeValues || this.attributeValues.getContext() !== this.activeContext) {
        this.attributeValues = this.model.bindList(`${this.associations.attribute_values}`, this.activeContext, [], [], { $$updateGroupId: this.batchId });
      }
      if (!this.assetBinding || this.assetBinding.getContext() !== this.activeContext) {
        this.assetBinding = this.model.bindList(`${this.associations.attachments}`, this.activeContext, [], [], { $$updateGroupId: this.batchId });
      }
    },

    getContractContext: function (sContractId) {
      // key is assumed to be GUID-like — adjust if contract key is numeric or different
      // V4 context binding by key:
      const sPath = `/Contracts(${sContractId})`;
      const oContextBinding = this.model.bindContext(sPath, { $$ownRequest: true });
      return oContextBinding.getBoundContext();
    },

    getActiveContext: function () {
      // ensure association list bindings are attached to current context
      this._ensureAssociationBindings();
      return this.activeContext;
    },

    getContractAttributes: function () {
      // returns Promise resolving to list of attribute objects
      this.getActiveContext();
      const sContractId = this.activeContext.getProperty("ID");
      return new Promise((resolve, reject) => {
        if (this.attributeDataFetchedMap[sContractId] && !this.resetContractAttributes) {
          const contexts = this.attributeValues.getContexts();
          resolve(contexts.map(c => c.getObject()));
        } else {
          // request contexts (0..N)
          this.attributeValues.getContexts(0, 200);
          this.attributeValues.attachEventOnce("dataReceived", () => {
            const contexts = this.attributeValues.getContexts();
            this.attributeDataFetchedMap[sContractId] = true;
            this.resetContractAttributes = false;
            resolve(contexts.map(c => c.getObject()));
          });
        }
      });
    },

    createAttribute: function ({ attribute_groups_ID, attributes_ID, value }) {
      this.getActiveContext();
      this.attributeValues.create({
        attribute_groups_ID,
        attributes_ID,
        valueJson: this._formattedJsonValue(value)
      });
    },

    updateAttribute: function (attributeRecord, updateValue) {
      // update an existing attribute — build key predicate and update valueJson
      return new Promise((resolve, reject) => {
        const { ID, contracts_ID, attribute_groups_ID, attributes_ID } = attributeRecord;
        // adapt getKeyPredicate usage to your OData V4 helper
        const keyPredicate = this.model.getKeyPredicate("/ContractsAttributes", {
          ID,
          contracts_ID,
          attribute_groups_ID,
          attributes_ID
        });
        const sPath = `/ContractsAttributes` + keyPredicate;
        const oContextBinding = this.model.bindContext(sPath, { $$ownRequest: true });
        const oContext = oContextBinding.getBoundContext();

        oContext.requestObject()
          .then(() => {
            oContext.setProperty("valueJson", this._formattedJsonValue(updateValue));
            resolve();
          })
          .catch(reject);
      });
    },

    _formattedJsonValue: function (value) {
      const jsonValue = { value: value === null ? "null" : value };
      const jsonString = JSON.stringify(jsonValue);
      return jsonString.replace(/"/g, '\\"');
    },

    save: function () {
      return this.model.submitBatch(this.batchId);
    },

    deleteContract: function (sContractId) {
      return new Promise((resolve, reject) => {
        const context = this.getContractContext(sContractId);
        context.requestObject().then(() => {
          context.delete().then(resolve).catch(reject);
        }).catch(reject);
      });
    }
  });
});
