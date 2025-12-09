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

        return BaseController.extend("com.dhi.cms.cmsadmin.controller.Templates", {
            onInit: function () {
                this.getRouter().getRoute("Templates").attachPatternMatched(this._onObjectMatched, this);
            },

            _onObjectMatched: async function (oEvent) {
                await this._refreshTable();
                this._setPersonalization();
                this.clearAllFilters();
            },

            onClearFilters: function () {
                this.byId("clearFilters").setEnabled(false);
                this.clearAllFilters();
            },

            clearAllFilters: function () {
                var oTable = this.byId("tblTemplates");
                var oFilter = null;

                var aColumns = oTable.getColumns();
                for (var i = 0; i < aColumns.length; i++) {
                    oTable.filter(aColumns[i], null);
                }
                this.byId("tblTemplates").getBinding("rows").filter(oFilter, "Application");
            },

            onTableFilter: function (oEvent) {
                var sQuery = oEvent.getParameter("value");
                var oTable = this.byId("tblTemplates");
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

            onTemplateDelete: function (oEvent) {
                let oBundle = this.getResourceBundle();
                let templateName = oEvent.getSource().getBindingContext().getObject().name;
                MessageBox.warning(oBundle.getText("templateDeleteWarning", [templateName]), {
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    initialFocus: MessageBox.Action.NO,
                    dependentOn: this.getView(),
                    onClose: (sAction) => {
                        if (sAction === "YES") {
                            oEvent.getSource().getBindingContext().delete("$auto").then(function () {
                                MessageToast.show(oBundle.getText("templateDeleteSuccess", [templateName]));
                                this._refreshTable();
                            }.bind(this), function (oError) {
                                MessageBox.error(oBundle.getText("templateDeleteError", [templateName]));
                            });
                        }
                    }
                });
            },

            onTemplateEdit: function (event) {
                let context = event.getSource().getBindingContext();
                let { ID } = context.getObject();   ``
                this.getRouter().navTo("Create Template", {
                    templateId: ID
                });
            },

            _refreshTable: function () {
                debugger
                this.byId("tblTemplates").getBinding("rows").refresh();
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
                    table: this.byId("tblTemplates"),
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
                var oTable = this.byId("tblTemplates");
                this.getModel("appModel").setProperty("/TemplateCount", oTable.getBinding("rows").getLength());
            }

        });
    });
