sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/CheckBox",
    "sap/m/DatePicker",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "sap/ui/core/ListItem"
], function (BaseObject, VBox, Label, Input, CheckBox, DatePicker, ComboBox, Item, ListItem) {

    "use strict";

    var DetailsFactory = BaseObject.extend("com.dhi.cms.util.DetailsFactory", {});

    DetailsFactory.renderDetailsControls = function (id, context) {
        var data = context.getObject();
        var detailsModel = context.getModel("Details"); // named local model
        // defensive defaults
        data = data || {};
        data.AttributeType = data.AttributeType || "String";
        data.AttributeValue = data.AttributeValue || "";
        data.Value = data.Value || "";

        // create safe unique control id
        var safeName = (data.Attribute_Name || "attr").replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
        var controlId = id + "-" + (data.Attribute_ID || safeName);

        // Label
        var label = new Label({ required: !!data.IsMandatory, text: data.Attribute_Name || "Attribute",showColon:true });
        label.addStyleClass("sapUiTinyMarginBottom");

        var control = null;
        var controlWidth = "350px";

        switch ((data.AttributeType || "").toLowerCase()) {
            case "text":
            case "string":
                control = new Input(controlId, {
                    type: "Text",
                    editable: "{appModel>/isFieldEditable}"
                });
                control.bindProperty("value", { path: 'Value', model: 'Details' });
                break;

            case "number":
            case "integer":
                control = new Input(controlId, {
                    type: "Number",
                    editable: "{appModel>/isFieldEditable}"
                });
                control.bindProperty("value", { path: 'Value', model: 'Details' });
                break;

            case "date":
                control = new DatePicker(controlId, {
                    width: controlWidth,
                    editable: "{appModel>/isFieldEditable}"
                });
                control.bindProperty("dateValue", { path: 'Value', model: 'Details' });
                break;

            case "boolean":
            case "array":
                // AttributeValue may be CSV string; create array of {key,text}
                var raw = data.AttributeValue || "";
                var arr = [];
                if (Array.isArray(raw)) {
                    arr = raw.map(function(item){
                        return { key: item.key || item, text: item.text || item };
                    });
                } else if (typeof raw === "string" && raw.trim() !== "") {
                    arr = raw.split(',').map(function (item) {
                        var t = item.trim();
                        return { key: t, text: t };
                    });
                }
                // store a selection array under a unique path
                var selectionPath = "/AttributeSelection" + controlId;
                detailsModel.setProperty(selectionPath, arr);

                control = new ComboBox(controlId, {
                    width: controlWidth,
                    selectedKey: "{Details>Value}",
                    editable: "{appModel>/isFieldEditable}"
                });
                var oArrayItems = new Item({ key: "{Details>key}", text: "{Details>text}" });
                control.bindItems({
                    path: "Details>" + selectionPath.replace(/^\//, ""),
                    template: oArrayItems,
                    templateShareable: true
                });
                break;

            case "association":
            case "association":
                // if AttributeTypeAssociation already an array, use it
                var assoc = data.AttributeTypeAssociation || [];
                detailsModel.setProperty("/AttributeSelection" + controlId, assoc);

                control = new ComboBox(controlId, {
                    width: controlWidth,
                    showSecondaryValues: true,
                    selectedKey: "{Details>Value}",
                    editable: "{appModel>/isFieldEditable}"
                });
                var oAssociationItems = new ListItem({
                    key: "{Details>code}",
                    text: "{Details>name}",
                    additionalText: "{Details>code}"
                });
                control.bindItems({
                    path: "Details>/AttributeSelection" + controlId,
                    sorter: new sap.ui.model.Sorter('code'),
                    template: oAssociationItems,
                    templateShareable: true
                });
                break;

            default:
                // fallback to text input
                control = new Input(controlId, {
                    type: "Text",
                    editable: "{appModel>/isFieldEditable}"
                });
                control.bindProperty("value", { path: 'Value', model: 'Details' });
                break;
        }

        // set the Details model on control if it's not inherited (harmless if already present)
        if (control && !control.getModel("Details")) {
            control.setModel(detailsModel, "Details");
        }

        var container = new VBox({
            width: controlWidth,
            items: [label, control]
        });
        container.addStyleClass("sapUiTinyMargin");
        // important: set the binding context to the attribute context and the correct model name
        container.setBindingContext(context, "Details");

        return container;
    };

    return DetailsFactory;
});
