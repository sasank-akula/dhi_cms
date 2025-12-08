sap.ui.define([
    "sap/ui/base/Object",
    "com/dhi/cms/cmsrequester/util/transaction/ContractHandler",
], function (BaseObject,ContractHandler) {
    "use strict";

    var instance = null;

    /**
     * Transaction manager to handle the CRUD operations of Products
     * @namespace com.dhi.cms.cmsrequester.util.transaction.ContractHandler
     * @class
     */
    var ContractHandler = BaseObject.extend("com.dhi.cms.cmsrequester.util.transaction.ContractHandler", {

        /**
         * Constructor function to initialize the Product manager class 
         * @memberof com.dhi.cms.cmsrequester.util.transaction.ContractHandler
         * @public
         * @class
         * @constructor
         */
        constructor: function () {
            if (instance) {
                throw new Error("Error: Instantiation failed. Use getInstance() instead of new.");
            }
            instance = this;
        }
    });

    // Static Attribute: Model instance
    ContractHandler.model = null;

    /**
     * Factory function to return the instance of the Product manager
     * @public 
     * @staic
     * @returns {com.dhi.cms.cmsrequester.util.transaction.ContractHandler} instance - Product manager instance
     */
    ContractHandler.getInstance = function () {
        if (!instance) {
            instance = new ContractHandler();
        }
        if(instance.model && instance.model.getId() !== ContractHandler.model.getId()) {
            // Model instance changed 
            instance.model.resetChanges(instance.batchId);
            instance.model = ContractHandler.model; // Update the instance of the new model
            instance.isBound = false;
        }
        return instance;
    };

    /**
     * Update the model instance if the model changes
     * @public
     */
    ContractHandler.updateModel = function(model) {
        ContractHandler.model = model;
    }

    return ContractHandler;
});