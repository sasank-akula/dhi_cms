
sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    'sap/m/Token',
    "../model/formatter"
],

    function (BaseController, MessageToast, MessageBox, Token, formatter) {
        "use strict";

        return BaseController.extend("com.dhi.cms.cmsadmin.controller.CreateAttributes", {
            formatter: formatter,

            onInit: function () {
                this.getRouter().getRoute("Create Attributes").attachPatternMatched(this._onObjectMatched, this);
            },
            onDeleteRow: function (oEvent) {
                debugger
                const oModel = this.getView().getModel("appModel");

                // Get row index in the table
                const oContext = oEvent.getSource().getBindingContext("appModel");
                const iIndex = oContext.getPath().split("/").pop();

                const aRows = oModel.getProperty("/Attributes/combovalues/results");

                aRows.splice(iIndex, 1);

                oModel.setProperty("/Attributes/combovalues/results", aRows);
            },
            onAddRow: function () {
                const oModel = this.getView().getModel("appModel");
                let aRows = oModel.getProperty("/Attributes/combovalues/results");
                if (!aRows) {
                    let pay = {
                        "results": []
                    }
                    oModel.setProperty("/Attributes/combovalues", pay);
                }
                debugger
                // Create array if not defined
                if (!Array.isArray(aRows)) {
                    aRows = [];
                }

                aRows.push({ value: "" });
                oModel.setProperty("/Attributes/combovalues/results", aRows);
            },
            _onObjectMatched: function (oEvent) {
                var sRouteName = oEvent.getParameter("name");
                this.attributeId = oEvent.getParameter("arguments").attributeId;
                var isEditMode = !!this.attributeId;
                this.getModel("appModel").setProperty("/isEditMode", isEditMode);
                // this._updateBreadcrumbs(sRouteName);
                var sTitle = isEditMode
                    ? this.getResourceBundle().getText("Update_Attribute_Title")
                    : this.getResourceBundle().getText("Create_Attribute_Title");
                this.getView().byId("createAttributeTitle").setText(sTitle);
                if (!this.attributeId) {
                    this.getModel("appModel").setProperty("/Attributes", {});
                    this.getModel("appModel").setProperty("/Attributes/type", "string");
                } else {
                    this._fnReadAttributes(this.attributeId);
                }
                // this._fnReadAssociation();
                this._fnRegisterMessageManager();
                // this.getModel("appModel").setProperty("/showVersionHistory", "0%");
            },

            _fnReadAttributes: function (attributeId) {
                debugger
                var that = this;
                this.getModel("oDataV2").read("/Attributes(" + attributeId + ")", {
                    urlParameters: {
                        "$expand": "combovalues"
                    },
                    success: function (oData, oResponce) {
                        debugger
                        // var aSystems = oData.integration.results.map(function (item) {
                        //     return item.system;
                        // });
                        that.getModel("appModel").setProperty("/Attributes", oData);
                        // that.getModel("appModel").setProperty("/Client", aSystems);
                        // that.setTags(oData.tags);
                        // if (oData.integration.results.length !== 0) {
                        //     that.getModel("appModel").setProperty("/isIntegrationVisible", true);
                        // } else {
                        //     that.getModel("appModel").setProperty("/isIntegrationVisible", false);
                        // }
                    },
                    error: function (oError) {
                        MessageBox.error(`${oError.message}: ${oError.statusCode} ${JSON.parse(oError.responseText).error.message.value}`);
                    }
                });
            },

            onSave: async function () {
                let bValid = true;
debugger
                const oNameInput = this.byId("attributeNameInput");
                const oTypeSelect = this.byId("AttributeTypeSelect");
                const oAliasInput = this.byId("aliasNameAttrInput");
                const oAssocSelect = this.byId("associationsSelect");

                const attributeName = oNameInput.getValue();
                const attributeType = oTypeSelect.getSelectedKey();
                const aliasName = oAliasInput.getValue();
                const association = oAssocSelect.getValue();
                const associationReq = this.getView().getModel("appModel").getProperty("/Attributes/type");

                // Helper
                const validateField = (value, control) => {
                    if (!value || value.trim() === "") {
                        control.setValueState("Error");
                        control.setValueStateText("This field is required.");
                        return false;
                    } else {
                        control.setValueState("None");
                        return true;
                    }
                };

                // Validations
                bValid &= validateField(attributeName, oNameInput);
                bValid &= validateField(attributeType, oTypeSelect);
                bValid &= validateField(aliasName, oAliasInput);

                if (associationReq === "Association") {
                    bValid &= validateField(association, oAssocSelect);
                } else {
                    oAssocSelect.setValueState("None");
                }

                if (!bValid) return;

                // Save + Navigate
                try {
                    await this.handleSaveAttribute();
                } catch (err) {
                    console.error("Save failed:", err);
                }
            },


            //Validation check
            // onSave:async function () {
            //     var bValid = true;
            //     var attributeName = this.byId("attributeNameInput").getValue();
            //     var attributeType = this.byId("AttributeTypeSelect").getSelectedKey();
            //     var aliasName = this.byId("aliasNameAttrInput").getValue();
            //     var association = this.byId("associationsSelect").getValue();
            //     var associationReq = this.getView().getModel("appModel").getProperty("/Attributes/type");

            //     if (attributeName === "") {
            //         this.byId("attributeNameInput").setValueState("Error");
            //         this.byId("attributeNameInput").setValueStateText("This field is required.");
            //         bValid = false;
            //     } else {
            //         this.byId("attributeNameInput").setValueState("None");
            //     }
            //     if (attributeType === "") {
            //         this.byId("AttributeTypeSelect").setValueState("Error");
            //         this.byId("AttributeTypeSelect").setValueStateText("This field is required.");
            //         bValid = false;
            //     } else {
            //         this.byId("AttributeTypeSelect").setValueState("None");
            //     }
            //     if (aliasName === "") {
            //         this.byId("aliasNameAttrInput").setValueState("Error");
            //         this.byId("aliasNameAttrInput").setValueStateText("This field is required.");
            //         bValid = false;
            //     } else {
            //         this.byId("aliasNameAttrInput").setValueState("None");
            //     }
            //     if (associationReq === "Association" && association === "") {
            //         this.byId("associationsSelect").setValueState("Error");
            //         this.byId("associationsSelect").setValueStateText("This field is required.");
            //         bValid = false;
            //     } else {
            //         this.byId("associationsSelect").setValueState("None");
            //     }
            //     if (bValid === true) {

            //         await this.byId("attributeNameInput").setValueState("None");
            //         await this.byId("AttributeTypeSelect").setValueState("None");
            //         await this.byId("aliasNameAttrInput").setValueState("None");
            //         await this.byId("associationsSelect").setValueState("None");
            //         this.handleSaveAttribute().then(()=>{
            //             debugger
            //             this.onNavigation('Attributes')
            //         });

            //         // this.resetValueStates("Save");
            //     }
            // },

            attributeTypeChange: function (oEvent) {
                debugger
                var selectedKey = oEvent.getParameter("selectedItem").getKey();
                var oComboBox = this.byId("associationsSelect");
                var oComboInput = this.byId("attributeTypeInput");
                oComboBox.setValue("");
                if (selectedKey == "number" || selectedKey == "integer")
                    oComboInput.setType("Number");
                else
                    oComboInput.setType("Text");
                if (selectedKey == 'boolean' || selectedKey == 'select' || selectedKey == 'date') {
                    this.getModel("appModel").setProperty("/Attributes/maxlength", null);
                    this.getModel("appModel").setProperty("/Attributes/minlength", null);
                }

            },

            resetValueStates: function (oEvent) {
                if (oEvent.getSource().getText("text") !== "Save") {
                    this.onNavigation("Attributes");
                }
                this.byId("attributeNameInput").setValueState("None");
                this.byId("AttributeTypeSelect").setValueState("None");
                this.byId("aliasNameAttrInput").setValueState("None");
            },

            handleSaveAttribute: function (oEvent) {
                var that = this;
                var oBundle = this.getResourceBundle();
                var oODataModel = this.getModel();
                var oModel = this.getModel("appModel").getData().Attributes;
                // if (oModel.type === "date" || oModel.value instanceof Date) {
                //     oModel.value = this.formatter.formatDateToString(oModel.value);
                // }

                var payload = {
                    "ID": oModel.ID,
                    // "attribute_id": oModel.attribute_id,
                    "name": oModel.name,
                    "desc": oModel.desc,
                    "alias": oModel.alias,
                    "type": oModel.type,
                    "value": oModel.value,
                    // "regex": oModel.regex,
                    "status": oModel.status,
                    "is_mandatory": this.byId("isMandatorySwitch").getState(),
                    "minlength": oModel.minlength,
                    "maxlength": oModel.maxlength,
                    "combovalues": oModel.type === 'select' ? oModel.combovalues.results : [] || []
                };

                debugger

                //Creating a new attribute.
                if (oModel.ID === undefined) {
                    var oListBinding = oODataModel.bindList("/Attributes", undefined, undefined, undefined, undefined);
                    this.oContext = oListBinding.create(payload, {
                        bSkipRefresh: true
                    });
                    this._refreshMessageManager();
                    this.getModel().submitBatch("$auto").then(function (response) {
                        var aMessages = that.getModel("message").getData();
                        var oErrorMessage = aMessages.slice().reverse().find((message) => message.type === 'Error');
                        if (oErrorMessage) {
                            oErrorMessage && MessageBox.error(oErrorMessage.message);
                            that._refreshMessageManager();
                            return;
                        } else {
                            var oBindingContext = that.getModel().bindContext(`/Attributes`, undefined, undefined, undefined, undefined);
                            oBindingContext.requestObject().then((aContexts) => {
                                console.log(aContexts);
                                var oModel = that.getModel("appModel").getData().Attributes;
                                var oContext = aContexts.value.filter((data) => { return data.name == oModel.name });
                                console.log(oContext);
                                MessageBox.success(oBundle.getText("attributeSaveSuccess"), {
                                    actions: [MessageBox.Action.OK],
                                    onClose: function (oAction) {
                                        if (oAction === MessageBox.Action.OK) {
                                            that.onNavigation("Attributes");
                                        }
                                    }
                                });
                                that._fnReadAttributes(oContext[0].ID);
                                that._refreshMessageManager();
                            })
                            // let contextBinding = that.getModel().bindList(`/Attributes`, undefined, undefined, undefined, undefined).requestContexts().then((aContexts)  => {
                            //     console.log(aContexts);
                            //     var oModel = that.getModel("appModel").getData().Attributes;
                            //     var oContext = aContexts.filter((data) => { return data.getObject().name == oModel.name});
                            //     console.log(oContext);
                            // });
                            // context.requestObject("updateAttachments").then(() => {

                        }
                    });
                    // this.oContext.created().then(function () {
                    //     MessageToast.show("Attributes have been saved.");
                    //     that._fnReadAttributes(that.oContext.getObject().ID);
                    // }, function (oError) {
                    //     MessageBox.error("Due to an error, attributes have not been saved.");
                    // });
                } else {
                    //Updating the attribute.
                    this._refreshMessageManager();
                    this.getModel("oDataV2").update("/Attributes(guid'" + oModel.ID + "')", payload, {
                        success: function (oData, oResponce) {
                            MessageBox.success(oBundle.getText("attributeUpdateSuccess"), {
                                actions: [MessageBox.Action.OK],
                                onClose: function (oAction) {
                                    if (oAction === MessageBox.Action.OK) {
                                        that.onNavigation("Attributes");
                                    }
                                }
                            });
                        },
                        error: function (oError) {
                            MessageBox.error(`${oError.message}: ${oError.statusCode} ${JSON.parse(oError.responseText).error.message.value}`);
                        }
                    });
                }
            },

            // setTags: function (tags) {
            //     var multiInputTags = this.byId("multiInputTags");

            //     if (tags !== undefined && tags !== null && tags !== "") {
            //         multiInputTags.setTokens([
            //             new Token({ text: tags, key: tags })
            //         ]);
            //     }
            // },

            // onTagsChange: function (oEvent) {
            //     var value = oEvent.getParameter("value");
            //     var multiInputTags = this.byId("multiInputTags");
            //     multiInputTags.setTokens([
            //         new Token({ text: value, key: value })
            //     ]);
            // },

            // onIntegrationChange: function (oEvent) {
            //     var bValue = oEvent.getParameter("state");

            //     if (bValue === true) {
            //         this.getModel("appModel").setProperty("/isIntegrationVisible", true);
            //     } else {
            //         this.getModel("appModel").setProperty("/isIntegrationVisible", false);
            //     }
            // },

            // _fnReadAssociation: function () {
            //     var that = this;
            //     var oModel = this.getModel();

            //     oModel.bindList("/Configuration", undefined, undefined, undefined, {
            //         $select: "targetTable,code,name"
            //     }).requestContexts().then(function (aContexts) {
            //         var aResults = aContexts.map(function (oContext) {
            //             return oContext.getObject();
            //         });
            //         that.getModel("appModel").setProperty("/Association", aResults);
            //     }).catch(function (oError) {
            //         MessageBox.error(`${oError.message}: ${oError.statusCode} ${oError.statusText}`);
            //     });
            // },

            // onVersionHistory: function (oEvent) {
            //     var that = this;
            //     var oTable = this.byId("tblVersionHistory");
            //     var paneSize = oEvent.getSource().data("footer");
            //     paneSize = paneSize === "ShowPane" ? "30%" : "0%";
            //     this.getModel("appModel").setProperty("/showVersionHistory", paneSize);
            //     oTable.getRowMode().setRowCount(5);
            //     oTable.getRowMode().setMinRowCount(5);

            //     var oModel = this.getModel();
            //     oModel.bindContext(`/getVersionHistory(ENTITY='Attributes',ID=${this.attributeId})`).requestObject().then(function (oData) {
            //         that.getModel("appModel").setProperty("/AttributesHistory", oData.value);
            //     }).catch(function (oError) {
            //         MessageBox.error(`${oError.message}: ${oError.statusCode} ${oError.statusText}`);
            //     });
            //     oTable.bindRows({
            //         path: "appModel>/AttributesHistory",
            //         sorter: [new sap.ui.model.Sorter("ON", true)]
            //     });
            // }


        });
    });
