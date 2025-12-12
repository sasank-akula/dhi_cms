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

            onTableFilter: function () {
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
                            var oTable = this.byId("tblTemplates");
                            oTable.setBusyIndicatorDelay(0);
                            oTable.setBusy(true);
                            oEvent.getSource().getBindingContext().delete("$auto").then(function () {
                                MessageToast.show(oBundle.getText("templateDeleteSuccess", [templateName]));
                                this._refreshTable();
                                oTable.setBusy(false);
                            }.bind(this), function (oError) {
                                MessageBox.error(oBundle.getText("templateDeleteError", [templateName]));
                                oTable.setBusy(false);
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
                if (this.oTablePersoController) {
                    this.oTablePersoController.destroy();
                }
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
