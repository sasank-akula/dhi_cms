sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/thirdparty/jquery",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
],

    function (BaseController, MessageToast, MessageBox, Fragment, JSONModel, jquery, Filter, FilterOperator, formatter) {
        "use strict";

        return BaseController.extend("com.dhi.cms.cmsadmin.controller.CreateAttributeGroup", {
            formatter: formatter,

            onInit: function () {
                this.getRouter().getRoute("Create Attribute Group").attachPatternMatched(this._onObjectMatched, this);
            },

            _onObjectMatched: function (oEvent) {
                var sRouteName = oEvent.getParameter("name");
                var oArgs = oEvent.getParameter("arguments");
                var attributeGroupId = oArgs.attributeGroupId;
                var isEditMode = !!attributeGroupId;
                this.getModel("appModel").setProperty("/isEditMode", isEditMode);
                // this._updateBreadcrumbs(sRouteName);
                this.attributeGroupId = attributeGroupId;
                this._fnRegisterMessageManager();
                var sTitle = isEditMode 
                    ? this.getResourceBundle().getText("Update_Attribute_Group_Title") 
                    : this.getResourceBundle().getText("Create_Attribute_Group_Title");
                this.getView().byId("attributeGroupTitle").setText(sTitle);
                debugger
                if (attributeGroupId) {
                    this._fnReadExistingAttributeGroup(attributeGroupId);
                    //  this._fnReadAttributes();
                } else {
                    this._fnReadAttributes();
                    // Initialize new arrays for CRUD
                    this.getModel("appModel").setProperty("/AttributeGroup", []);
                    this.getModel("appModel").setProperty("/AssociatedAttributes", []);
                }
                this._fnRegisterMessageManager();
                // this.getModel("appModel").setProperty("/showVersionHistory", "0%");
            },

            mergeAttributes: function (oldAttributes, newAttributes) {
                // Create a map to store attributes by name for quick lookup
                const attributeMap = new Map(oldAttributes.map(attr => [attr.name, attr]));

                // Merge or update attributes from newAttributes
                newAttributes.forEach(newAttr => {
                    if (!attributeMap.has(newAttr.name)) {
                        // If the attribute name is not already in oldAttributes, add it
                        oldAttributes.push({ ...newAttr });
                    } else {
                        // If the attribute name already exists, update its properties
                        const existingAttr = attributeMap.get(newAttr.name);
                        Object.assign(existingAttr, newAttr); // Merge newAttr properties into existingAttr
                    }
                });

                return oldAttributes;
            },

            _fnReadAttributes: function () {
                var that = this;
                debugger
                // Read data from the "oDataV2" model
                this.getModel("oDataV2").read("/Attributes", {
                    success: function (oData, oResponse) {
                        // Get the array of results
                        var newAttributes = oData.results;

                        // Get the current AssociatedAttributes
                        var currentAttributes = that.getModel("appModel").getProperty("/AssociatedAttributes") || [];

                        // Create a map of current attributes by name for quick lookup
                        const currentAttributesMap = new Map(currentAttributes.map(attr => [attr.name, attr]));

                        // Iterate over each new attribute
                        newAttributes.forEach(function (attr) {
                            // If the attribute is not in the current attributes, set Rank to 0
                            if (!currentAttributesMap.has(attr.name)) {
                                attr.Rank = 0;
                            }
                        });

                        // Merge newAttributes into AssociatedAttributes, filtering out duplicates
                        var mergedAttributes = that.mergeAttributes(currentAttributes, newAttributes);

                        // Log the modified results for debugging
                        console.log("Merged Attributes:", mergedAttributes);

                        // Set the modified data to the "appModel"
                        that.getModel("appModel").setProperty("/AssociatedAttributes", mergedAttributes);
                    },
                    error: function (oError) {
                        // Handle error (Optional: add error handling logic here)
                        console.error("Error reading Attributes:", oError);
                    }
                });
            },


            //Validation check
            onSave: function () {
                var bValid = true;
                var attributeName = this.byId("attributeGrpNameInput").getValue();
                var aliasName = this.byId("aliasNameInputAtrGrp").getValue();

                if (attributeName === "") {
                    this.byId("attributeGrpNameInput").setValueState("Error");
                    this.byId("attributeGrpNameInput").setValueStateText("This field is required.");
                    bValid = false;
                } else {
                    this.byId("attributeGrpNameInput").setValueState("None");
                }
                // Alias name is not mandatory as per task # 3358
                // if (aliasName === "") {
                //     this.byId("aliasNameInputAtrGrp").setValueState("Error");
                //     this.byId("aliasNameInputAtrGrp").setValueStateText("This field is required.");
                //     bValid = false;
                // } else {
                //     this.byId("aliasNameInputAtrGrp").setValueState("None");
                // }
                if (bValid === true) {
                    this.handleSaveAttributeGroup();
                    this.onNavigation('Attribute Groups')
                    this.byId("attributeGrpNameInput").setValueState("None");
                    // this.byId("aliasNameInputAtrGrp").setValueState("None");
                }
            },
            handleSaveAttributeGroup: function () {
                let oBundle = this.getResourceBundle();
                var that = this;
                var oModel = this.getModel("appModel").getData().AttributeGroup;
                var aAssociatedAttributes = this.getModel("appModel").getData().AssociatedAttributes;

                var payload = {
                    "name": oModel.name,
                    "alias": oModel.alias,
                    "desc": oModel.desc,
                    "attributes": []
                };

                // Prepare payload for new attribute creation
                for (var i = 0; i < aAssociatedAttributes.length; i++) {
                    var associateAttributes = aAssociatedAttributes[i];

                    // Check if the attribute has a defined ID, indicating it's not newly added
                    if (associateAttributes.Rank > 0) {
                        var attributesPayload = {
                            "sortID": associateAttributes.Rank
                        };

                        // Include attribute_ID if it already exists (for reordering)
                        if (associateAttributes.attribute && associateAttributes.attribute.ID) {
                            attributesPayload.attribute_ID = associateAttributes.attribute.ID;
                        } else {
                            // For new attribute groups, include the ID of the associated attribute group
                            attributesPayload.attribute_ID = associateAttributes.ID; // Assuming 'ID' is the attribute ID
                        }

                        payload.attributes.push(attributesPayload);
                    }
                }

                if (oModel.ID === undefined) {
                    var oListBinding = this.getModel().bindList("/Attribute_Groups", undefined, undefined, undefined, undefined);
                    this.oContext = oListBinding.create(payload, {
                        bSkipRefresh: true
                    });
                    this._refreshMessageManager();
                    this.getModel().submitBatch("$auto").then(function(response) {
                        var aMessages = that.getModel("message").getData();
                        var oErrorMessage = aMessages.slice().reverse().find((message) => message.type === 'Error');
                        if (oErrorMessage) {
                            oErrorMessage && MessageBox.error(oErrorMessage.message);
                            that._refreshMessageManager();
                            return;
                        } else {
                            var sNewGroupPath = that.oContext.getPath();
                            var newAttributeGroupId = that.extractIdFromPath(sNewGroupPath);
                            that._refreshMessageManager();
                            MessageBox.success(oBundle.getText("attributeGroupSaveSuccess"));
                            debugger
                            setTimeout(function () {
                                that._fnReadExistingAttributeGroup(newAttributeGroupId).then(function (oData) {
                                    that.getModel("appModel").setProperty("/AttributeGroup/attribute_group_id", oData.attribute_group_id);
                                });
                            }, 1000);
                        }
                    });
                    // this.oContext.created().then(function () {
                    //     var sNewGroupPath = that.oContext.getPath();
                    //     var newAttributeGroupId = that.extractIdFromPath(sNewGroupPath);
                    //     MessageToast.show("Attribute Group has been saved.");
                    //     setTimeout(function () {
                    //         that._fnReadExistingAttributeGroup(newAttributeGroupId).then(function (oData) {
                    //             that.getModel("appModel").setProperty("/AttributeGroup/attribute_group_id", oData.attribute_group_id);
                    //         });
                    //     }, 1000);
                    // }, function (oError) {
                    //     MessageBox.error("Due to an error, attribute group has not been saved.");
                    // });
                } else {
                    // Scenario 1 for update - change name, alias or description 
                    // Fetch the existing data before updating
                    this.getModel("oDataV2").read("/Attribute_Groups(" + oModel.ID + ")?$expand=attributes($select=ID,sortID;", {
                        success: function (oData) {
                            console.log("Existing data for Attribute Group ID:", oModel.ID, oData);

                            // Proceed with the update using the prepared payload directly
                            that.getModel("oDataV2").update("/Attribute_Groups(" + oModel.ID + ")?$expand=attributes($select=ID,sortID)", payload, {
                                success: function (oData, oResponse) {
                                    MessageBox.success(oBundle.getText("attributeGroupUpdateSuccess"));
                                },
                                error: function (oError) {
                                    MessageBox.error(`${oError.message}: ${oError.statusCode} ${JSON.parse(oError.responseText).error.message.value}`);
                                }
                            });
                        },
                        error: function (oError) {
                            MessageBox.error(oBundle.getText("attributeGroupReadError")); 
                        }
                    });
                }
            },


            // Add the helper method to get that ID generated 
            extractIdFromPath: function (sPath) {
                var match = sPath.match(/\(([^)]+)\)/);
                return match ? match[1] : null;
            },

            onAddAttributes: function () {
                debugger
                var that = this;
                var oView = this.getView();

                if (!this._pDialog) {
                    this._pDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.dhi.cms.cmsadmin.fragments.attributegroups.AddAttributes",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                // Initialize the rank counter based on existing attributes
                var oAppModel = this.getModel("appModel");
                var aAssociatedAttributes = oAppModel.getProperty("/AssociatedAttributes") || [];
                this._iRankCounter = aAssociatedAttributes.length ? Math.max(...aAssociatedAttributes.map(attr => attr.Rank)) + 1 : 1;
                console.log("Rank counter initialized to:", this._iRankCounter);

                // Scenario 4 Update - Check if AssociatedAttributes has sortID property
                var hasSortID = aAssociatedAttributes.some(attr => attr.sortID !== undefined);

                if (hasSortID) {
                    // Call _fnReadAttributes to fetch all attributes
                    that._fnReadAttributes();
                }

                this._pDialog.then(function (oDialog) {
                    oDialog.open();
                });
            },


            onSearchAttributes: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter("name", FilterOperator.Contains, sValue);
                var oBinding = oEvent.getParameter("itemsBinding");
                oBinding.filter([oFilter]);
            },

            // addSelectedAttributes: function (oEvent) {
            //     var selectedAttributes = oEvent.getParameter("selectedItems");
            //     var oModel = this.getModel("appModel").getData().AssociatedAttributes;

            //     for (var i = 0; i < selectedAttributes.length; i++) {
            //         oModel.push({
            //             "attribute": {
            //                 "name": selectedAttributes[i].getAggregation("cells")[0].getProperty("text")
            //             },
            //             "attribute_ID": selectedAttributes[i].getAggregation("cells")[1].getProperty("text")
            //         });
            //     }
            //     this.byId("tblAssociatedAttributes").getBinding("items").refresh();
            // },

            onDeleteAttribute: function (oEvent) {
                // Get the button that triggered the event
                var oButton = oEvent.getSource();

                // Get the context binding path of the button's parent item
                var sPath = oButton.getBindingContext("appModel").getPath();
                console.log("Modifying item at path:", sPath);

                // Get the app model
                var oModel = this.getModel("appModel");

                // Get the data array
                var aData = oModel.getProperty("/AssociatedAttributes");
                console.log("Current data:", aData);

                // Find the index of the item to be modified
                var iIndex = parseInt(sPath.split("/").pop(), 10);
                console.log("Index to modify:", iIndex);

                // Scenario 2 for update - Check if there is a sortID and set Rank to 0
                if (aData[iIndex].sortID !== undefined) {
                    // Remove the item if it has sortID
                    aData.splice(iIndex, 1);
                } else {
                    // Change the Rank property to 0 for the selected item
                    aData[iIndex].Rank = 0;
                }

                console.log("Data after setting rank to 0 or removing:", aData);

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
                oModel.setProperty("/AssociatedAttributes", aRankedData);

                console.log("Data after re-ranking:", aRankedData);

                // Update the title with the new count
                var oTitle = this.byId("attributesTitle");
                var iNewCount = aRankedData.filter(function (item) {
                    return item.Rank > 0;
                }).length;
                oTitle.setText("Attributes (" + iNewCount + ")");

                // Refresh the model to reflect changes
                oModel.refresh();
            },


            onDialogClose: function (oEvent) {
                let oBundle = this.getResourceBundle();
                var aContexts = oEvent.getParameter("selectedContexts");
                console.log("Dialog closed, selected contexts:", aContexts);

                if (aContexts && aContexts.length) {
                    // Initialize an array to hold selected names
                    var aSelectedNames = [];

                    // Get the app model
                    var oAppModel = this.getModel("appModel");
                    console.log(oAppModel);

                    // Get the current AssociatedAttributes
                    var aAssociatedAttributes = oAppModel.getProperty("/AssociatedAttributes") || [];
                    // Create a map for quick lookup by name
                    var oAssociatedAttributesMap = new Map(aAssociatedAttributes.map(attr => [attr.name, attr]));

                    // Iterate over each selected context
                    aContexts.forEach(function (oContext) {
                        var oObject = oContext.getObject();
                        console.log("Selected Object:", oObject);

                        // Check if the attribute is already in AssociatedAttributes and has Rank > 0
                        if (oAssociatedAttributesMap.has(oObject.name) && oAssociatedAttributesMap.get(oObject.name).Rank > 0) {
                            console.log("Attribute already exists with Rank > 0, not updating Rank:", oObject.name);
                        } else {
                            // Log the current rank counter value
                            console.log("Current Rank Counter:", this._iRankCounter);

                            // Update the Rank
                            oObject.Rank = this._iRankCounter++;
                            console.log("Updated Rank:", oObject.Rank);

                            // Update scenario 3 - the sortID if it exists in any of the associated attributes
                            var hasSortID = aAssociatedAttributes.some(attr => attr.sortID !== undefined);
                            if (hasSortID) {
                                oObject.sortID = oObject.Rank;
                            }
                            console.log("Updated sortID:", oObject.sortID);

                            // Log the new rank counter value
                            console.log("New Rank Counter:", this._iRankCounter);

                            // Push the name to the array
                            aSelectedNames.push(oObject.name);

                            // If it's a new attribute, add it to the AssociatedAttributes array
                            if (!oAssociatedAttributesMap.has(oObject.name)) {
                                aAssociatedAttributes.push(oObject);
                            }
                        }
                    }.bind(this)); // Bind `this` to use `this._iRankCounter` inside the function

                    // Display the selected names
                    // MessageToast.show("You have chosen " + aSelectedNames.join(", "));
                    // Count of selected items to display on UI
                    var aSelectedCount = aSelectedNames.length;
                    console.log("total count of selected items", aSelectedCount);

                    // Update the app model with the new ranks and added attributes
                    oAppModel.setProperty("/AssociatedAttributes", aAssociatedAttributes);
                    oAppModel.refresh();
                    console.log("App model refreshed with updated ranks and added attributes.", oAppModel);

                    // Count attributes with Rank greater than 0
                    var aRankedAttributesCount = aAssociatedAttributes.filter(function (attribute) {
                        return attribute.Rank > 0;
                    }).length;

                    // Update the count in the Title text dynamically
                    var oTable = this.byId("tblAssociatedAttributes");
                    var oTitle = oTable.getHeaderToolbar().getContent()[0]; // Assuming Title is the first element in OverflowToolbar
                    oTitle.setText("Attributes (" + aRankedAttributesCount + ")");
                } else {
                    MessageToast.show(oBundle.getText("attributeGroupNoNewItemSelected"));
                }

                // Clear any filters applied to the items aggregation of the dialog
                var oSource = oEvent.getSource();
                console.log("Event Source:", oSource);

                var oBinding = oSource.getBinding("items");
                console.log("Items Binding before clearing filters:", oBinding);

                if (oBinding) {
                    oBinding.filter([]);
                    console.log("Filters cleared from items binding.");
                } else {
                    console.error("Items binding not found.");
                }
            },

            onDropSelected: function (oEvent) {
                var that = this;
                var oDragged = oEvent.getParameter("draggedControl");
                var oDropped = oEvent.getParameter("droppedControl");
                var sDropPosition = oEvent.getParameter("dropPosition");

                var oTable = this.byId("tblAssociatedAttributes");
                var oModel = this.getView().getModel("appModel");
                var aData = oModel.getProperty("/AssociatedAttributes");
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
                oModel.setProperty("/AssociatedAttributes", aRankedData);

                // Refresh the UI control to reflect the changes
                // oTable.getModel().refresh(); // Refresh the model
                // oTable.getBinding("items").refresh(); // Refresh the binding

                console.log(aData);
            },


            _fnReadExistingAttributeGroup: function (attributeGroupId) {
                debugger
                var that = this;
                // Construct the OData service path for the Attribute_Groups entity
                var sPath = "/Attribute_Groups(" + attributeGroupId + ")";

                // Define the parameters for expanding related entities and selecting specific fields
                var oParameters = {
                    $expand: "templates($select=ID,sortID;$expand=templates($select=ID,name,desc)),attributes($select=ID,attribute,sortID;$expand=attribute($select=ID,attribute_id,name,desc))"
                };

                // Bind the context for the specified path with the defined parameters
                var oBindingContext = this.getModel().bindContext(sPath, null, oParameters);

                // Request the object data from the bound context
                oBindingContext.requestObject().then(function (oData) {
                    // Check if attributes is an array
                    if (Array.isArray(oData.attributes)) {
                        // Iterate over the attributes and set the Rank, name, and desc properties
                        oData.attributes.forEach(function (attribute) {
                            // Set Rank equal to sortID if available, otherwise default to 0
                            attribute.Rank = attribute.sortID || 0;

                            // Move the name and desc properties from nested attribute to the top-level
                            if (attribute.attribute) {
                                attribute.name = attribute.attribute.name || "";
                                attribute.desc = attribute.attribute.desc || "";
                            } else {
                                // Default to empty strings if the attribute object is missing
                                attribute.name = "";
                                attribute.desc = "";
                            }
                        });

                        // Update the model with the modified template and attribute groups
                        that.getModel("appModel").setProperty("/AttributeGroup", oData);
                        that.getModel("appModel").setProperty("/AssociatedAttributes", oData.attributes);
                    }

                    // Log the updated data after setting the properties
                    console.log("Updated AttributeGroup data:", that.getModel("appModel").getProperty("/AttributeGroup"));
                    console.log("Updated AssociatedAttributes data:", that.getModel("appModel").getProperty("/AssociatedAttributes"));
                });
            },

            // onVersionHistory: function (oEvent) {
            //     var that = this;
            //     var oTable = this.byId("tblVersionHistory");
            //     var paneSize = oEvent.getSource().data("footer");
            //     paneSize = paneSize === "ShowPane" ? "30%" : "0%";
            //     this.getModel("appModel").setProperty("/showVersionHistory", paneSize); 
            //     oTable.getRowMode().setRowCount(5); 
            //     oTable.getRowMode().setMinRowCount(5);               
               
            //     var oModel = this.getModel();
            //     oModel.bindContext(`/getVersionHistory(ENTITY='Attribute_Groups',ID=${this.attributeGroupId})`).requestObject().then(function (oData) {
            //         that.getModel("appModel").setProperty("/AttributeGroupsHistory", oData.value);
            //     }).catch(function (oError) {
            //         MessageBox.error(`${oError.message}: ${oError.statusCode} ${oError.statusText}`);
            //     });
            //     oTable.bindRows({
            //         path: "appModel>/AttributeGroupsHistory",
            //         sorter: [new sap.ui.model.Sorter("ON", true)]
            //     });
            // }

        });
    });