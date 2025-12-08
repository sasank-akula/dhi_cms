sap.ui.define([
    "./BaseController",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"

],

    function (BaseController, Fragment, Filter, FilterOperator, MessageToast, MessageBox) {
        "use strict";

        return BaseController.extend("com.dhi.cms.cmsadmin.controller.CreateTemplate", {
            onInit: function () {
                this.getRouter().getRoute("Create Template").attachPatternMatched(this._onObjectMatched, this);
            },

            _onObjectMatched: function (oEvent) {
                var sRouteName = oEvent.getParameter("name");
                var oArgs = oEvent.getParameter("arguments");
                var templateId = oArgs.templateId;
                var isEditMode = !!templateId;
                this.getModel("appModel").setProperty("/isEditMode", isEditMode);
                this._updateBreadcrumbs(sRouteName);
                this.templateId = templateId;
                this._fnRegisterMessageManager();
                var sTitle = isEditMode ? this.getResourceBundle().getText("Update_Template_Title") : this.getResourceBundle().getText("Create_Template_Title");
                this.getView().byId("createTemplateTitle").setText(sTitle);
                this.templateRankLogic();
                if (templateId) {
                    this._fnReadExistingTemplate(templateId);
                } else {
                    this._fnReadAttributeGroup();
                    // Initialize new arrays for CRUD
                    this.getModel("appModel").setProperty("/Template", []);
                    this.getModel("appModel").setProperty("/AttributeGroups", []);
                }
            },

            templateRankLogic: function () {
                this.getModel("appModel").refresh(true);
                var oTreeTable = this.byId("tblAttrGrpTemplate2");
                var oFilter = new sap.ui.model.Filter("Rank", sap.ui.model.FilterOperator.GT, 0);
                var oBindingInfo = {
                    path: "appModel>/AttributeGroups",
                    parameters: {
                        arrayNames: ["attributes"]
                    },
                    filters: [oFilter]
                };

                oTreeTable.bindRows(oBindingInfo);
            },

            mergeAttributeGroups: function (oldAttributeGroups, newAttributeGroups) {
                // Create a map to store attributes by name for quick lookup
                const attributeGrpMap = new Map(oldAttributeGroups.map(attrGrp => [attrGrp.name, attrGrp]));

                // Merge or update attributes from newAttributeGroups
                newAttributeGroups.forEach(newAttrGrp => {
                    if (!attributeGrpMap.has(newAttrGrp.name)) {
                        // If the attribute group name is not already in oldAttributeGroups, add it
                        oldAttributeGroups.push({ ...newAttrGrp });
                    } else {
                        // If the attribute group name already exists, update its properties
                        const existingAttrGrp = attributeGrpMap.get(newAttrGrp.name);
                        Object.assign(existingAttrGrp, newAttrGrp); // Merge newAttr properties into existingAttr
                    }
                });

                return oldAttributeGroups;
            },

            _fnReadAttributeGroup: function () {
                var that = this;
                var oModel = this.getModel(); // OData V4

                oModel.bindList("/Attribute_Groups", undefined, undefined, undefined, {
                    $$updateGroupId: "readAttributeGroups",
                    $expand: "attributes($expand=attribute)"
                }).requestContexts().then(function (aContexts) {
                    var newAttributeGroups = aContexts.map(oContext => oContext.getObject());

                    // Flatten attribute.name and attribute.desc into each attribute item
                    newAttributeGroups.forEach(group => {
                        group.attributes?.forEach(attr => {
                            if (attr.attribute) {
                                attr.name = attr.attribute.name || null;
                                attr.desc = attr.attribute.desc || null;
                            }
                        });
                    });

                    // Deduplicate attribute groups
                    var currentAttributeGroups = that.getModel("appModel").getProperty("/AttributeGroups") || [];
                    const currentAttributeGroupsMap = new Map(currentAttributeGroups.map(attrGrp => [attrGrp.name, attrGrp]));

                    var filteredNewAttributeGroups = newAttributeGroups.filter(attrGrp => {
                        if (!currentAttributeGroupsMap.has(attrGrp.name)) {
                            attrGrp.Rank = 0;
                            return true;
                        }
                        return false;
                    });

                    // Set filtered result in app model
                    that.getModel("appModel").setProperty("/FilteredAttributeGroups", filteredNewAttributeGroups);
                }).catch(function (oError) {
                    console.error("Error reading Attribute Groups (V4):", oError);
                });
            },

            _fnReadExistingTemplate: function (templateId) {
                var that = this;
                // Construct the OData service path for the Templates entity
                var sPath = "/Templates(" + templateId + ")";

                // Define the parameters for expanding related entities
                var oParameters = {
                    $expand: "attribute_groups($select=ID,sortID;$expand=attribute_groups($select=ID,attribute_group_id,name,desc;$expand=attributes($select=sortID;$expand=attribute)))"
                };

                // Bind the context for the specified path with the defined parameters
                var oBindingContext = this.getModel().bindContext(sPath, null, oParameters);

                // Request the object data from the bound context
                oBindingContext.requestObject().then(function (oData) {
                    if (Array.isArray(oData.attribute_groups)) {
                        oData.attribute_groups.forEach(function (group) {
                            // Set Rank equal to sortID if available, otherwise default to 0
                            group.Rank = group.sortID || 0;

                            if (group.attribute_groups) {
                                // Copy name and desc from the nested attribute_groups entity
                                group.name = group.attribute_groups.name || "";
                                group.desc = group.attribute_groups.desc || "";

                                if (Array.isArray(group.attribute_groups.attributes)) {
                                    group.attributes = group.attribute_groups.attributes.map(function (attrWrapper) {
                                        var flattenedAttr = attrWrapper.attribute || {};
                                        // Add isPortalEnabled from wrapper to the attribute
                                        // flattenedAttr.isPortalEnabled = attrWrapper.isPortalEnabled;
                                        // Also keep sortID from wrapper if needed for sorting
                                        flattenedAttr.sortID = attrWrapper.sortID;
                                        return flattenedAttr;
                                    });

                                    // Now sort the attributes array by sortID ascending
                                    group.attributes.sort(function (a, b) {
                                        return (a.sortID || 0) - (b.sortID || 0);
                                    });
                                } else {
                                    group.attributes = [];
                                }
                            } else {
                                group.name = "";
                                group.desc = "";
                                group.attributes = [];
                            }
                        });

                        // Update the model with the modified data
                        that.getModel("appModel").setProperty("/Template", oData);
                        that.getModel("appModel").setProperty("/AttributeGroups", oData.attribute_groups);

                    }
                });
            },

            onAddAttributeGroup: function () {
                var that = this;
                var oView = this.getView();

                if (!this._pDialog) {
                    this._pDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.dhi.cms.cmsadmin.fragments.templates.AddAttributeGroup",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        // oDialog.setModel(oView.getModel());
                        return oDialog;
                    });
                }
                // After opening the dialog, call _fnReadAttributeGroup to refresh the data
                // this._fnReadAttributeGroup();
                // Initialize the rank counter based on existing attributes
                var oAppModel = this.getModel("appModel");
                var aAssociatedAttributeGroups = oAppModel.getProperty("/AttributeGroups") || [];
                this._iRankCounter = aAssociatedAttributeGroups.length ? Math.max(...aAssociatedAttributeGroups.map(attr => attr.Rank)) + 1 : 1;
                // Scenario 4 Update - Check if AttributeGroups has sortID property
                var hasSortID = aAssociatedAttributeGroups.some(attrGrp => attrGrp.sortID !== undefined);

                if (hasSortID) {
                    // Call _fnReadAttributeGroup to fetch all attribute groups
                    that._fnReadAttributeGroup();
                }

                // this._pDialog.then(function (oDialog) {
                //     oDialog.open();
                // });
                this._pDialog.then(function (oDialog) {
                    oDialog.open();
                });

            },

            // onAttributeSwitchChange: function (oEvent) {
            //     var bNewState = oEvent.getParameter("state");
            //     var oSwitch = oEvent.getSource();
            //     var oModel = this.getModel("appModel");

            //     var sCurrentPath = oSwitch.getBindingContext("appModel").getPath();
            //     // Example: "/AttributeGroups/0/attributes/1"

            //     var aParts = sCurrentPath.split("/");  // ["", "AttributeGroups", "0", "attributes", "1"]
            //     if (aParts.length < 5) {
            //         MessageBox.error("Invalid path to attribute.");
            //         return;
            //     }

            //     var iGroupIndex = parseInt(aParts[2], 10);
            //     var iAttributeIndex = parseInt(aParts[4], 10);

            //     var oAttributeEntry = oModel.getProperty("/AttributeGroups/" + iGroupIndex);
            //     var oNestedAttribute = oAttributeEntry?.attribute_groups?.attributes?.[iAttributeIndex];

            //     if (!oNestedAttribute || !oNestedAttribute.ID) {
            //         MessageBox.error("Please save template to change the attribute details.");
            //         return;
            //     }

            //     var sID = oNestedAttribute.ID;

            //     var oDataModel = this.getModel("oDataV2");
            //     var sPath = "/AttributeGroupAttribute(" + sID + ")";

            //     var payload = {
            //         isPortalEnabled: bNewState
            //     };

            //     var oBundle = this.getResourceBundle();

            //     oDataModel.update(sPath, payload, {
            //         success: function () {
            //             MessageToast.show(oBundle.getText("attributeUpdateSuccess"));
            //         },
            //         error: function (oError) {
            //             var sErrorMsg = oError.message + ": " + oError.statusCode;
            //             try {
            //                 sErrorMsg += " - " + JSON.parse(oError.responseText).error.message.value;
            //             } catch (e) {}
            //             MessageBox.error(sErrorMsg);
            //         }
            //     });
            // },

            onDropSelected: function (oEvent) {
                var that = this;
                var oDragged = oEvent.getParameter("draggedControl");
                var oDropped = oEvent.getParameter("droppedControl");
                var sDropPosition = oEvent.getParameter("dropPosition");

                var oTable = this.byId("tblAttrGrpTemplate");
                var oModel = this.getView().getModel("appModel");
                var aData = oModel.getProperty("/AttributeGroups");
                var aRankedData = aData.filter(function (item) {
                    return item.Rank > 0;
                });

                var iDraggedIndex = oTable.indexOfItem(oDragged);
                var iDroppedIndex = oTable.indexOfItem(oDropped);

                if (sDropPosition === "After") {
                    iDroppedIndex++;
                }

                // Remove the dragged item from its current index
                var oDraggedData = aRankedData.splice(iDraggedIndex, 1)[0];

                // Insert the dragged item into the new position
                aRankedData.splice(iDroppedIndex, 0, oDraggedData);

                // Update Rank property for all items in the filtered array
                for (var i = 0; i < aRankedData.length; i++) {
                    aRankedData[i].Rank = i + 1; // Update Rank starting from 1
                    if (aRankedData[i].sortID !== undefined) {
                        aRankedData[i].sortID = aRankedData[i].Rank; // Update sortID if available
                    }
                }
                // Update the original data array with updated ranks and sortIDs if available
                aData.forEach(function (item) {
                    var found = aRankedData.find(function (rankItem) {
                        return rankItem.ID === item.ID;
                    });
                    if (found) {
                        item.Rank = found.Rank;
                        if (found.sortID !== undefined) {
                            item.sortID = found.Rank; // Update sortID with updated Rank
                        }
                    }
                });

                // Set the modified data back to the model
                oModel.setProperty("/AttributeGroups", aRankedData);
            },

            //Validation check
            onSave: function () {
                var bValid = true;
                var templateName = this.byId("templateNameInput").getValue();
                var templateDesc = this.byId("templateDescInput").getValue();

                if (templateName === "") {
                    this.byId("templateNameInput").setValueState("Error");
                    this.byId("templateNameInput").setValueStateText("This field is required.");
                    bValid = false;
                } else {
                    this.byId("templateNameInput").setValueState("None");
                }
                if (bValid === true) {
                    this.handleSaveTemplate();
                    this.byId("templateNameInput").setValueState("None");
                    this.byId("templateDescInput").setValueState("None");
                    this.onNavigation('Templates')
                }
            },

            onSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("name", FilterOperator.Contains, sValue);
                var oBinding = oEvent.getParameter("itemsBinding");
                oBinding.filter([oFilter]);
            },

            handleSaveTemplate: function () {
                var that = this;
                let oBundle = this.getResourceBundle();
                var oModel = this.getModel("appModel").getData().Template;
                var aAssociatedAttributeGroups = this.getModel("appModel").getData().AttributeGroups;

                // Define the payload with the current attribute groups and their ranks
                var payload = {
                    "name": oModel.name,
                    "desc": oModel.desc,
                    "attribute_groups": []
                };

                // Prepare payload with attribute groups' current ID and rank
                for (var i = 0; i < aAssociatedAttributeGroups.length; i++) {
                    var attrGroup = aAssociatedAttributeGroups[i];

                    // Check if the attribute group has a defined ID, indicating it's not newly added
                    if (attrGroup.Rank > 0) {
                        var attributeGroupsPayload = {
                            "sortID": attrGroup.Rank
                        };

                        // Include attribute_groups_ID if it already exists (for reordering)
                        if (attrGroup.attribute_groups_ID) {
                            attributeGroupsPayload.attribute_groups_ID = attrGroup.attribute_groups_ID;
                        } else {
                            // For new attribute groups, include the ID of the associated attribute group
                            attributeGroupsPayload.attribute_groups_ID = attrGroup.ID; // Assuming 'ID' is the attribute group ID
                        }

                        payload.attribute_groups.push(attributeGroupsPayload);
                    }
                }

                // Creating a new template
                if (oModel.ID === undefined) {
                    var oListBinding = this.getModel().bindList("/Templates", undefined, undefined, undefined, undefined);
                    this.getModel().resetChanges();
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
                            var sNewGroupPath = that.oContext.getPath();
                            var newTemplateId = that.extractIdFromPath(sNewGroupPath);
                            that._refreshMessageManager();
                            MessageBox.success(oBundle.getText("templateSaved"));
                            setTimeout(function () {
                                that._fnReadExistingTemplate(newTemplateId).then(function (oData) {
                                    that.getModel("appModel").setProperty("/Template/template_id", oData.template_id);
                                });
                            }, 1000);
                        }
                    });
                } else {
                    // Updating an existing template
                    this.getModel("oDataV2").read("/Templates(" + oModel.ID + ")?$expand=attribute_groups($select=ID,sortID)", {
                        success: function (oData) {

                            // Proceed with the update using the prepared payload directly
                            that.getModel("oDataV2").update("/Templates(" + oModel.ID + ")?$expand=attribute_groups($select=ID,sortID)", payload, {
                                success: function (oData, oResponse) {
                                    MessageBox.success(oBundle.getText("templateUpdated"));
                                },
                                error: function (oError) {
                                    MessageBox.error(`${oError.message}: ${oError.statusCode} ${JSON.parse(oError.responseText).error.message.value}`);
                                }
                            });
                        },
                        error: function (oError) {
                            MessageBox.error(oBundle.getText("failedToReadTemplates"));
                        }
                    });
                }
            },

            // Add the helper method to get that ID generated 
            extractIdFromPath: function (sPath) {
                var match = sPath.match(/\(([^)]+)\)/);
                return match ? match[1] : null;
            },


            onDialogClose: function (oEvent) {
                let oBundle = this.getResourceBundle();
                var aContexts = oEvent.getParameter("selectedContexts");

                if (aContexts && aContexts.length) {
                    // Initialize an array to hold selected names
                    var aSelectedNames = [];

                    // Get the app model
                    var oAppModel = this.getModel("appModel");
                    // Get the current AssociatedAttributeGroups
                    var aAssociatedAttributeGroups = oAppModel.getProperty("/AttributeGroups") || [];
                    // Create a map for quick lookup by name
                    var oAssociatedAttributeGroupsMap = new Map(aAssociatedAttributeGroups.map(attrGrp => [attrGrp.name, attrGrp]));
                    // Iterate over each selected context
                    aContexts.forEach(function (oContext) {
                        var oObject = oContext.getObject();
                        if (oAssociatedAttributeGroupsMap.has(oObject.name) && oAssociatedAttributeGroupsMap.get(oObject.name).Rank > 0) {
                        } else {

                            // Update the Rank
                            oObject.Rank = this._iRankCounter++;

                            // Log the new rank counter value

                            // Push the name to the array
                            aSelectedNames.push(oObject.name);

                            // If it's a new attribute, add it to the AssociatedAttributes array
                            if (!oAssociatedAttributeGroupsMap.has(oObject.name)) {
                                aAssociatedAttributeGroups.push(oObject);
                            }
                        }
                    }.bind(this));

                    // Display the selected names
                    // MessageToast.show("You have chosen " + aSelectedNames.join(", "));
                    // Count of selected items to display on UI
                    var aSelectedCount = aSelectedNames.length
                    // Update the app model with the new ranks
                    oAppModel.setProperty("/AttributeGroups", aAssociatedAttributeGroups);
                    oAppModel.refresh();
                    // Count attributes with Rank greater than 0
                    var aAssociatedAttributeGroups = oAppModel.getProperty("/AttributeGroups");
                    var aRankedAttributeGroupsCount = aAssociatedAttributeGroups.filter(function (attribute) {
                        return attribute.Rank > 0;
                    }).length;

                    // Update the count in the Title text dynamically
                    var oTable = this.byId("tblAttrGrpTemplate");
                    var oTitle = oTable.getHeaderToolbar().getContent()[0]; // Assuming Title is the first element in OverflowToolbar
                    oTitle.setText("Attribute Groups (" + aRankedAttributeGroupsCount + ")");
                } else {
                    MessageToast.show(oBundle.getText("templateNoNewItemSelected"));
                }

                // Clear any filters applied to the items aggregation of the dialog
                var oSource = oEvent.getSource();

                var oBinding = oSource.getBinding("items");

                if (oBinding) {
                    oBinding.filter([]);
                } else {
                    console.error("Items binding not found.");
                }
                // Re-apply TreeTable binding after model update
                //this.templateRankLogic();
            },

            onDeleteAttributeGroup: function (oEvent) {
                // Get the button that triggered the event
                var oButton = oEvent.getSource();

                // Get the context binding path of the button's parent item
                var sPath = oButton.getBindingContext("appModel").getPath();

                // Get the app model
                var oModel = this.getModel("appModel");

                // Get the data array
                var aData = oModel.getProperty("/AttributeGroups");

                // Find the index of the item to be modified
                var iIndex = parseInt(sPath.split("/").pop(), 10);

                // Scenario 2 for update - Check if there is a sortID and set Rank to 0
                if (aData[iIndex].sortID !== undefined) {
                    // Remove the item if it has sortID
                    aData.splice(iIndex, 1);
                } else {
                    // Change the Rank property to 0 for the selected item
                    aData[iIndex].Rank = 0;
                }

                // Filter out the items with Rank > 0
                var aRankedData = aData.filter(function (item) {
                    return item.Rank > 0;
                });

                // Reassign the ranks and sortIDs starting from 1
                aRankedData.forEach(function (item, index) {
                    item.Rank = index + 1;
                    if (item.sortID !== undefined) {
                        item.sortID = index + 1;
                    }
                });

                // Merge the ranked data back with the original data
                aData.forEach(function (item) {
                    if (item.Rank === 0) {
                        var existingItem = aRankedData.find(rankedItem => rankedItem.ID === item.ID);
                        if (!existingItem) {
                            aRankedData.push(item);
                        }
                    }
                });

                // Update the model with the modified array
                oModel.setProperty("/AttributeGroups", aRankedData);

                // Update the title with the new count
                var oTitle = this.byId("attributeGroupsTitle");
                var iNewCount = aRankedData.filter(function (item) {
                    return item.Rank > 0;
                }).length;
                oTitle.setText("Attribute Groups (" + iNewCount + ")");

                // Refresh the model to reflect changes
                oModel.refresh();
            },




        });
    });
