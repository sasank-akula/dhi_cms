sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/table/TablePersoController",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/FilterType'
],
    function (BaseController, MessageBox, MessageToast, TablePersoController, Filter, FilterOperator, FilterType) {
        "use strict";
        
        return BaseController.extend("com.dhi.cms.cmsadmin.controller.AttributeGroups", {
            onInit: function () {
                this.getRouter().getRoute("Attribute Groups").attachPatternMatched(this._onObjectMatched, this);
            },

            _onObjectMatched: function (oEvent) {
                this._refreshTable();
                this._setPersonalization();
                this.clearAllFilters();
                this._getAttributeGrpList();

            },

            _createTokens: function (aTemplates) {
                // Convert the filtered templates into tokens
                return aTemplates.map(function (oTemplate) {
                    return new Token({
                        key: oTemplate.name,
                        text: oTemplate.name
                    });
                });
            },

            _getAttributeGrpList: function () {
                var oTable = this.byId("tblAttributeGroups");
                var oMainModel = this.getOwnerComponent().getModel();
                var bindingList = oMainModel.bindList("/getGroupAssociatedTemplates()", undefined, undefined, undefined);
                var appModel = this.getModel("appModel");
                oTable.setBusy(true);
                bindingList.requestContexts().then(function (aContexts) {
                    var attributes = aContexts.map((item) => ({
                        ID: item.getProperty("ID"),
                        ATTRIBUTE_GROUP_ID: item.getProperty("ATTRIBUTE_GROUP_ID"),
                        NAME: item.getProperty("NAME"),
                        DESC: item.getProperty("DESC"),
                        ALIAS: item.getProperty("ALIAS"),
                        ROLE: item.getProperty("ROLE"),
                        TEMPLATE_NAME: item.getProperty("TEMPLATE_NAME")
                    }));
                    appModel.setProperty("/attributeAssociatedTemplates", attributes);
                    oTable.setModel(appModel, "appModel");
                    oTable.bindRows("appModel>/attributeAssociatedTemplates");
                }).catch(function (error) {
                    console.error("Error fetching contexts:", error);
                }).finally(function () {
                    oTable.setBusy(false);
                });
            },

            /**
             * Handler to trigger navigation for Attribute group edit page
             * @memberof com.pimx.prodsphere.pxm.controller.AttributeGroups
             * @public
             * @param {sap.ui.base.Event} event The event object
             */
            onAttributeGroupEdit: function (event) {
                let context = event.getSource().getBindingContext("appModel");
                let { ID } = context.getObject();
                this.getRouter().navTo("Create Attribute Group", {
                    attributeGroupId: ID
                });
            },

            /**
             * Handler to delete Attribute from Attribute group page
             * @memberof com.pimx.prodsphere.pxm.controller.AttributeGroups
             * @public
             * @param {sap.ui.base.Event} event The event object
             */
            onAttributeGroupDelete: function (oEvent) {
                let oBundle = this.getResourceBundle();
                var attributeGroupName = oEvent.getSource().getBindingContext("appModel").getObject().NAME;
                var attributeGroupId = oEvent.getSource().getBindingContext("appModel").getObject().ID;
                var oOwnerComponent = this.getOwnerComponent();
                var oMainModel = oOwnerComponent.getModel();
                let path = `/Attribute_Groups(${attributeGroupId})`;
                var oParameters = {
                    $expand: "templates($expand=templates),attributes($expand=attribute)"
                };
                let contextBinding = oMainModel.bindContext(path, null, oParameters);
                var that = this;
                let sConfirmationMessage = oBundle.getText("attributeGroupDeleteConfirmationMessage", [attributeGroupName]);
                MessageBox.warning(sConfirmationMessage, {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    initialFocus: MessageBox.Action.NO,
                    dependentOn: this.getView(),
                    onClose: (sAction) => {
                        if (sAction === "YES") {
                            let attributeContext = contextBinding.getBoundContext();
                            attributeContext.requestObject().then((data) => {
                                console.log(data);
                                attributeContext.delete().then(function () {
                                    let sSuccessMessage = oBundle.getText("attributeGroupDeleteSuccessMessage", [attributeGroupName]);
                                    MessageToast.show(sSuccessMessage);
                                    that._getAttributeGrpList();
                                }).catch(function (oError) {
                                    let sErrorMessage = oBundle.getText("attributeGroupDeleteErrorMessage", [attributeGroupName]);
                                    MessageBox.error(sErrorMessage);
                                });
                            });
                        }
                    }
                });
            },

            /**
             * Refresh the Attribute Groups table
             * @memberof com.pimx.prodsphere.pxm.controller.AttributeGroups
             * @private
             */
            _refreshTable: function () {
                this.byId("tblAttributeGroups").getBinding("rows").refresh();
            },

            onClearFilters: function () {
                this.byId("clearFilters").setEnabled(false);
                this.clearAllFilters();
            },

            clearAllFilters: function () {
                var oTable = this.byId("tblAttributeGroups");
                var oFilter = null;

                var aColumns = oTable.getColumns();
                for (var i = 0; i < aColumns.length; i++) {
                    oTable.filter(aColumns[i], null);
                }
                this.byId("tblAttributeGroups").getBinding("rows").filter(oFilter, "Application");
            },

            onTableFilter: function (oEvent) {
                var sQuery = oEvent.getParameter("value");
                var oTable = this.byId("tblAttributeGroups");
                var oBinding = oTable.getBinding("rows");

                if (sQuery) {
                    this.byId("clearFilters").setEnabled(true);

                    // Get all columns from the table
                    var aColumns = oTable.getColumns();
                    var aFilters = [];

                    // Iterate through each column to create filters
                    aColumns.forEach(function (oColumn) {
                        var sFilterProperty = oColumn.getFilterProperty();
                        if (sFilterProperty) {
                            // Create a filter for each column
                            var oFilter = new Filter({
                                path: sFilterProperty,
                                operator: sap.ui.model.FilterOperator.Contains,
                                value1: sQuery,
                                caseSensitive: false
                            });
                            aFilters.push(oFilter);
                        }
                    });

                    // Combine filters with OR condition
                    var oCombinedFilter = new sap.ui.model.Filter({
                        filters: aFilters,
                        and: false
                    });

                    // Apply the combined filter to the binding
                    oBinding.filter(oCombinedFilter, sap.ui.model.FilterType.Application);
                    oEvent.preventDefault();

                } else {
                    this.byId("clearFilters").setEnabled(false);

                    // Clear all filters
                    oBinding.filter([], sap.ui.model.FilterType.Application);
                }
            },

            _setPersonalization: function () {
                var oBundle, oDeferred, oPersoService = {
                    oPersoData: {
                        _persoSchemaVersion: "1.0",
                        aColumns: []
                    },
                    getPersData: function () {
                        oDeferred = new jQuery.Deferred();
                        if (!this._oBundle) {
                            this._oBundle = this.oPersoData;
                        }
                        oBundle = this._oBundle;
                        oDeferred.resolve(oBundle);
                        return oDeferred.promise();
                    },
                    setPersData: function (oBundle) {
                        oDeferred = new jQuery.Deferred();
                        this._oBundle = oBundle;
                        oDeferred.resolve();
                        return oDeferred.promise();
                    },
                    delPersData: function () {
                        oDeferred = new jQuery.Deferred();
                        oDeferred.resolve();
                        return oDeferred.promise();
                    }
                };
                this.oTablePersoController = new TablePersoController({
                    table: this.byId("tblAttributeGroups"),
                    persoService: oPersoService
                });
            },

            /**
             * Open the dialog for personalization
             * @public
             * @param{sap.ui.base.Event} oEvent change Event
             */
            onPersonalization: function () {
                // Cause the dialog to open when the button is pressed
                this.oTablePersoController.openDialog();
            },

            onRowsUpdated: function () {
                var oTable = this.byId("tblAttributeGroups");
                this.getModel("appModel").setProperty("/AttributeGroupCount", oTable.getBinding("rows").getLength());
            }

        });
    });

