
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/table/TablePersoController",
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/FilterType',
    "sap/ui/core/Fragment",
    'sap/ui/export/Spreadsheet',
        'sap/ui/export/library'
], (Controller, MessageBox, MessageToast, TablePersoController, Filter, FilterOperator, FilterType, Fragment, Spreadsheet,exportLibrary) => {
    "use strict";
    var EdmType = exportLibrary.EdmType;
    return Controller.extend("com.dhi.cms.cmsrequester.controller.Contracts", {
        onInit() {
            this.getRouter().getRoute("Contracts").attachPatternMatched(this._onObjectMatched, this);

        },
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },
        onGoBtnPress: function (oEvent) {
            let oFilterbar = this.byId("idFilterBar")
            let aFilterItems = oFilterbar.getAllFilterItems();
            let aFilters = []

            aFilterItems.forEach((aFilterItem) => {
                let sPropertyName = aFilterItem.getName();
                let aSelectedKeys;
                if (sPropertyName === "contract_id") {
                    let sValue = aFilterItem.getControl().getValue();
                    if (sValue) {
                        aFilters.push(new Filter(sPropertyName, "Contains", sValue));
                    }

                }
                else {
                    aSelectedKeys = aFilterItem.getControl().getSelectedKeys();
                    if (aSelectedKeys) {
                        aSelectedKeys.forEach(sValue => {
                            aFilters.push(new Filter(sPropertyName, "EQ", sValue));
                        }
                        )
                    }
                }

            });
            let oTable = this.byId("tblContracts");
            let oBinding = oTable.getBinding("rows");
            oBinding.filter(aFilters);
            MessageToast.show("Filters Applied Sucessfully.")

        },
        onClearFilters: function () {
            this.byId("tblContracts").getBinding("rows").filter([]);
            MessageToast.show("Filters cleared Sucessfully.")
        },
        onCreateContract: function (sNavigationTarget) {
            var oRouter = this.getOwnerComponent().getRouter();
            var sNavigationTarget;
            if (sNavigationTarget) {
                oRouter.navTo(sNavigationTarget);
            } else {
                console.error("Navigation target not defined.");
            }
        },
        onEditContract: async function (oEvent) {
            const oSource = oEvent.getSource();
            const oBindingContext = oSource.getBindingContext();
            if (!oBindingContext) return;
            const sID = oBindingContext.getProperty("ID");
            const oModel = this.getView().getModel();

            const sEntityPath = `/Contracts('${sID}')`;
            let oContext = oModel.bindContext(sEntityPath, undefined, { $expand: "attribute_values" });
            let oDetail = await oContext.requestObject().then(function (oData) {
                console.log(oData);
                return oData;
            })
            console.log("Server contract + attribute_values:", oDetail);
            this.getView().getModel("contractModel").setData(oDetail);


        },
        _onObjectMatched: function (oEvent) {
            this._refreshTable();
            this._setPersonalization();
            this.clearAllFilters();
        },
        onExportData: function (event) {
            let table = this.byId("tblContracts");
            let binding = table.getBinding('rows');
            let columns = this.createColumnConfig();
            let settings = {
                workbook: {
                    columns: columns,
                    hierarchyLevel: 'Level'
                },
                dataSource: binding,
                fileName: 'Contracts.xlsx',
                worker: false // We need to disable worker because we are using a MockServer as OData Service
            };

            let sheet = new Spreadsheet(settings);
            sheet.build().finally(function () {
                sheet.destroy();
            });
        },
        createColumnConfig: function () {
            var columns = [];

            columns.push({
                label: 'ID',
                property: 'ID',
                type: EdmType.String
            });

            columns.push({
                label: 'Contract Name',
                property: 'alias',
                type: EdmType.String
            });

            columns.push({
                label: 'Contract ID',
                property: 'contract_id',
                type: EdmType.String
            });

            columns.push({
                label: 'Description',
                property: 'description',
                type: EdmType.String
            });

            // navigation property for template name
            columns.push({
                label: 'Contract Type',
                property: 'templates/name',
                type: EdmType.String
            });

            columns.push({
                label: 'Start Date',
                property: 'start_date',
                type: EdmType.DateTime
            });

            columns.push({
                label: 'End Date',
                property: 'end_date',
                type: EdmType.DateTime
            });

            return columns;
        },


        onProductDelete: function (event) {
            let oBundle = this.getResourceBundle();
            let productHandler = ProductManager.getInstance();
            let context = event.getSource().getBindingContext();
            let { ID, name } = context.getObject();
            MessageBox.warning(oBundle.getText("confirmDeleteProduct", [name]), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                initialFocus: MessageBox.Action.NO,
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.YES) {
                        productHandler.deleteProduct(ID).then(() => {
                            this._refreshTable();
                            MessageBox.success(oBundle.getText("productDeleted", [name]));
                        }).catch((err) => {
                            MessageBox.error(oBundle.getText("productDeleteError", [name]));
                        });
                    }
                },
                dependentOn: this.getView()
            });
        },
        _refreshTable: function () {
            this.byId("tblContracts").getBinding("rows").refresh();
        },
        onProductEdit: function (event) {
            let context = event.getSource().getBindingContext();
            let { ID } = context.getObject();
            this.getRouter().navTo("Create Products", {
                productId: ID
            });
        },

        onClearFilters: function () {
            this.byId("clearFilters").setEnabled(false);
            this.clearAllFilters();
        },

        clearAllFilters: function () {
            var oTable = this.byId("tblContracts");
            var oFilter = null;

            var aColumns = oTable.getColumns();
            for (var i = 0; i < aColumns.length; i++) {
                oTable.filter(aColumns[i], null);
            }
            this.byId("tblContracts").getBinding("rows").filter(oFilter, "Application");
            this.byId("tblContracts").getBinding("rows").filter([]);

        },

        onTableFilter: function (oEvent) {
            var sQuery = oEvent.getParameter("value");
            var oTable = this.byId("tblContracts");
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
                table: this.byId("tblContracts"),
                persoService: oPersoService
            });
        },

        onPersonalization: function () {
            // Cause the dialog to open when the button is pressed
            this.oTablePersoController.openDialog();
        },

        onRowsUpdated: function () {
            var oTable = this.byId("tblContracts");
            this.getModel("appModel").setProperty("/ProductCount", oTable.getBinding("rows").getLength());
        }


    });
});