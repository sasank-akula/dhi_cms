sap.ui.define([
    "sap/ui/base/Object",
    'sap/ui/export/library',
    'sap/ui/export/Spreadsheet'
], function (BaseObject, exportLibrary, Spreadsheet) {

    var EdmType = exportLibrary.EdmType;

    /**
     * Constructor for Table Helper object
     * @memberof com.pimx.prodsphere.pxm.util.VersionHistoryTableHelper
     * @public
     */
    var TableHelper = BaseObject.extend("com.dhi.cms.cmsadmin.util.VersionHistoryTableHelper", {});

    /**
     * Export the data from the Products table
     * @memberof com.pimx.prodsphere.pxm.util.VersionHistoryTableHelper
     * @public
     * @param {sap.ui.base.Event} event The event object 
     */
    TableHelper.onExportData = function (event) {
        let table = this.byId("tblVersionHistory");
        let binding = table.getBinding('rows');
        let columns = TableHelper.createColumnConfig();
        let settings = {
            workbook: {
                columns: columns,
                hierarchyLevel: 'Level'
            },
            dataSource: binding,
            fileName: 'VersionHistory.xlsx',
            worker: false // We need to disable worker because we are using a MockServer as OData Service
        };

        let sheet = new Spreadsheet(settings);
        sheet.build().finally(function () {
            sheet.destroy();
        });
    }

    /**
     * Returns the columns array of table
     * @memberof com.pimx.prodsphere.pxm.util.VersionHistoryTableHelper
     * @public
     * @static
     * @returns {Array} columns - Table columns array
     */
    TableHelper.createColumnConfig = function () {
        var columns = [];
        columns.push({
            label: 'Change Type',
            property: 'CHANGE_TYPE',
            type: EdmType.String
        });
        columns.push({
            label: 'On',
            property: 'ON',
            type: EdmType.String
        });
        columns.push({
            label: 'By',
            property: 'BY',
            type: EdmType.String
        });
        columns.push({
            label: 'Field',
            property: 'FIELD',
            type: EdmType.String
        });
        columns.push({
            label: 'New Value',
            property: 'NEW_VALUE',
            type: EdmType.String
        });
        columns.push({
            label: 'Old Value',
            property: 'OLD_VALUE',
            type: EdmType.String
        });
        return columns;
    }

    return TableHelper;
});

