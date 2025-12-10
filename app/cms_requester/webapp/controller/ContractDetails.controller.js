sap.ui.define([
    "./BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "com/dhi/cms/cmsrequester/util/transaction/ContractManager",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/ui/core/BusyIndicator"
], (BaseController, Controller, MessageBox, MessageToast, ContractManager, Messaging, Message, MessageType, BusyIndicator) => {
    "use strict";

    return BaseController.extend("com.dhi.cms.cmsrequester.controller.ContractDetails", {
        onInit() {
            this.getRouter().getRoute("ContractDetails").attachPatternMatched(this._onObjectMatched, this);

        },
        _onObjectMatched: function (oEvent) {
            BusyIndicator.show(0);

            this._SelectedContractType;
            const oArgs = oEvent.getParameter("arguments");
            this.contractId = oArgs.contractId;
            const sRouteName = oEvent.getParameter("name");
            const isEditMode = !!this.contractId;
            this._oIconTabBar = this.byId("iconTabBar");
            if (!this.contractId) {
                this._initializeContractMasters();
            }
            else {
                this._getContractDetails();
            }

            // this._initializeViewState(oEvent, isEditMode, sRouteName);

            this._focusOnBasicInfoTab();
            // this._loadTenantData();

            const oView = this.getView();
            // set message model
            oView.setModel(Messaging.getMessageModel(), "message");

            Messaging.removeAllMessages();
            BusyIndicator.hide();

        },

        _initializeContractMasters: function () {
            const data = {
                "ID": null,
                "alias": null,
                "contract_id": null,
                "description": null,
                "end_date": null,
                "is_visible": true,
                "name": null,
                "start_date": null,
                "templates_ID": null,
                "attribute_values": [],
                "attachments": []
            };

            this.getModel("contractModel").setData(data);
        },
        _getContractDetails: async function () {
            let oModel = this.getModel();
            let sPath = "/Contracts('" + this.contractId + "')";
            let oContext = oModel.bindContext(sPath, undefined, { $expand: "attribute_values,attachments" });
            let oDetail = await oContext.requestObject().then(function (oData) {
                console.log(oData);
                return oData;
            })
            this.contractData = oDetail;
            this.getModel("contractModel").setData(oDetail);
            this.getModel("appModel").setProperty("/status", oDetail.status);

        },
        _initializeViewState: function (oEvent, isEditMode, sRouteName) {
            this.getModel("appModel").setProperty("/isEditMode", isEditMode);
            // this.oItemsProcessor = [];
            // this.documentTypes = this.getFileCategories();
            // this._updateBreadcrumbs(sRouteName);
            // this._fnRegisterMessageManager();
            this._handleProductData(oEvent);
        },
        _handleProductData: function (oEvent) {
            let model = this.getView().getModel();
            let ContractHandler = ContractManager.getInstance();
            !ContractHandler?.isBound && ContractHandler.initializeBinding(model, this);
            ContractHandler?.resetAttributeFetchState();
            ContractHandler.controller = this;

            if (!this.productId) {
                this.prepareTabNavigation(oEvent);
                let context = ContractHandler?.createNewProduct();
                this.getView().setBindingContext(context);
                this.getModel("appModel").setProperty("/prodLangEnabled", false);
                this.isProductEditable("Draft");
                this.getModel("translation").setData({});
            } else {
                this.prepareTabNavigation(oEvent);
                ContractHandler?.getExistingProduct(this.productId).then((context) => {
                    this.getView().setBindingContext(context);
                    if (!this.getView().getBindingContext()) {
                        const oModel = context.getModel(); // Get the model from the context
                        this.getView().setModel(oModel);
                        setTimeout(() => {
                            this.getView().setBindingContext(context); // Set new binding context after clearing
                        }, 0);
                    }
                    let status = formatter.getStatusDescription(context.getObject().status_ID);
                    this.productColumnID = context.getObject().product_id;
                    this.getModel("appModel").setProperty("/prodLangEnabled", true);
                    this.isProductEditable(status);
                    this.getSelectedLanguages();
                    this.getSelectedChannels();
                    this.getModel("translation").setProperty("/translationName", context.getObject().name);
                    this.getModel("translation").setProperty("/translationAlias", context.getObject().alias);
                    this.getModel("translation").setProperty("/translationDescription", context.getObject().description);

                    if (this.getModel().hasPendingChanges()) {
                        this.getModel().resetChanges();
                        this.resetCatChanges(context.getObject());
                    }
                });
            }
        },
        _focusOnBasicInfoTab: function () {
            const oIconTabBar = this.byId("iconTabBar");
            oIconTabBar.setSelectedKey("BasicInfo");
            const oBasicInfoTab = oIconTabBar.getItems()[0].getDomRef();
            if (oBasicInfoTab) {
                oBasicInfoTab.focus();
            }
            this._currentTabKey = "BasicInfo";

        },

        onTabSelect: function (navItemId) {
            let sSelectedKey = this.byId("iconTabBar").getSelectedKey();
            if (navItemId) {
                sSelectedKey = navItemId;
            }
            let sSelectedContractType = this.byId("contractTypeSelect").getSelectedKey();
            if (!this.byId("contractTypeSelect").getSelectedKey()) {

                this.byId("iconTabBar").setSelectedKey("BasicInfo")
                MessageBox.warning("Please select the Contract Type")
                return false;
            }

            if (sSelectedKey != "BasicInfo") {
                if (this._SelectedContractType
                    != sSelectedContractType) {
                    this.initializeDetails();
                }
            }
            this._SelectedContractType = sSelectedContractType;
            return true;
        },
        handleNextTabpress: function (navItemId) {
            if (this.onTabSelect(navItemId)) {
                this._oIconTabBar.setSelectedKey(navItemId);

            }
        },
        initializeDetails: function () {
            this.getBusyDialog().open();
            this.getBusyDialog().setText("...loading Basic Information.");
            const oODataModel = this.getOwnerComponent().getModel(); // your OData V4 model (must be set in Component)
            let sSelectedTemplate = this.byId("contractTypeSelect").getSelectedKey();
            const that = this;

            // 1) Build the CDS view navigation path (portal view)
            const templatePortalPath = `/TemplatePortalCatalogue(TemplateID='${sSelectedTemplate}')`;

            // 2) Bind a context to that path and then create a list binding for the "Set" navigation
            const templateContextBinding = oODataModel.bindContext(templatePortalPath);
            const templateContext = templateContextBinding.getBoundContext();

            // list binding for child collection 'Set' under that context (own request so it fetches independently)
            this.productSpecificationBinding = oODataModel.bindList("Set", templateContext, [], [], {
                $$ownRequest: true
            });

            this.model = oODataModel;
            this.isBound = true;

            // 3) Request the contexts (rows). Adjust range (0,100) if you expect more rows.
            return this.productSpecificationBinding.requestContexts(0, 100).then(function (aContexts) {
                // aContexts is an array of sap.ui.model.odata.v4.Context
                const rows = aContexts.map(function (ctx) {
                    return ctx.getObject(); // plain JS object per row from the CDS view
                });
                const groupsMap = {};
                rows.forEach(function (row) {
                    const gid = row.Attribute_Groups_ID || "defaultGroup";
                    if (!groupsMap[gid]) {
                        groupsMap[gid] = {
                            Attribute_Groups_ID: gid,
                            Attribute_Group_Name: row.Attribute_Group_Name || "Group",
                            Attribute_Group_Role: row.Attribute_Group_Role || "",
                            AttributeGroupOrder: row.AttributeGroupOrder || 0,
                            Attributes: []
                        };
                    }

                    // Determine the value based on whether contractId exists
                    let attributeValue = row.Value || "";

                    if (that.contractId) {
                        if (that.contractData && that.contractData.attribute_values) {
                            // Find matching attribute_value by both attribute_groups_ID and attributes_ID
                            const matchingAttrValue = that.contractData.attribute_values.find(av =>
                                av.attribute_groups_ID === row.Attribute_Groups_ID &&
                                av.attributes_ID === row.Attribute_ID
                            );

                            if (matchingAttrValue) {
                                attributeValue = matchingAttrValue.valueJson || "";
                            }
                        }
                    }

                    // normalize attribute row to a shape your factory expects
                    const attr = {
                        Attribute_ID: row.Attribute_ID,
                        Attribute_Name: row.Attribute_Name,
                        AttributeOrder: row.AttributeOrder || 0,
                        IsMandatory: !!row.Is_Required,
                        AttributeType: row.AttributeType || "String",
                        AttributeTypeAssociation: row.AttributeTypeAssociatin || [],
                        Value: attributeValue,
                        IsPortalEnabled: typeof row.IsPortalEnabled !== "undefined" ? row.IsPortalEnabled : null,
                        Portal_ID: row.Portal_ID || null
                    };
                    groupsMap[gid].Attributes.push(attr);
                });

                // convert map -> sorted array
                let grouped = Object.keys(groupsMap).map(function (k) { return groupsMap[k]; });
                grouped.sort(function (a, b) { return a.AttributeGroupOrder - b.AttributeGroupOrder; });
                grouped.forEach(function (g) {
                    g.Attributes.sort(function (a, b) { return a.AttributeOrder - b.AttributeOrder; });
                });

                const modelData = { AttributeGroups: grouped };
                that.getOwnerComponent().getModel("Details").setData(modelData);
                console.log(that.getOwnerComponent().getModel("Details").getData())
                that.getBusyDialog().close();

                return modelData; // optional: allow caller to chain
            }).catch(function (err) {
                jQuery.sap.log.error("Failed to load TemplatePortalCatalogue Set", err);
                throw err;
            });
        },
        onNavigation: function (sNavigationTarget) {
            var oRouter = this.getOwnerComponent().getRouter();
            var sNavigationTarget;
            if (sNavigationTarget) {
                oRouter.navTo(sNavigationTarget);
            } else {
                console.error("Navigation target not defined.");
            }
        },
        handleSaveContractDetails: function () {
            console.log(this.getView().getModel("Details").getData());
        },
        formatDate: function (sDate) {
            if (!sDate) { return ""; }
            // handle both ISO strings and already formatted dates
            try {
                var d = new Date(sDate);
                if (isNaN(d.getTime())) { return sDate; }
                var pad = function (n) { return n < 10 ? "0" + n : n; };
                return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
            } catch (e) {
                return sDate;
            }
        },

        /**
         * parts[0] = Value (string or boolean-like)
         * parts[1] = AttributeType (Input, DatePicker, MultiInput, CheckBox...)
         */
        formatAttribute: function (sValue, sAttributeType) {
            // normalize null/undefined
            if (sValue === null || typeof sValue === "undefined" || sValue === "") {
                return ""; // show empty if no value
            }

            // Checkboxes -> render Yes/No
            if (sAttributeType === "CheckBox") {
                // Accept boolean or string representations
                if (sValue === true || sValue === "true" || sValue === "1" || sValue === 1) { return "Yes"; }
                return "No";
            }

            // DatePicker -> format date
            if (sAttributeType === "DatePicker") {
                return this.formatDate(sValue);
            }

            // MultiInput -> if tokens serialized as comma-separated string, show as-is;
            // if it's an array, join with comma:
            if (sAttributeType === "MultiInput") {
                if (Array.isArray(sValue)) {
                    return sValue.join(", ");
                }
                return String(sValue);
            }

            // Default -> just return the value as string
            return String(sValue);
        },
        onUploadCompleted: async function (oEvent) {
            let vItem = oEvent.getParameters().item;
            let Attachments = this.getModel("contractModel").getProperty("/attachments") || [];
            let aItems = Array.isArray(vItem) ? vItem : [vItem];
            let that = this;

            // Wait for all files to be processed
            const newFiles = await Promise.all(
                aItems.map(async function (oItem) {
                    return await that._getfiledata(oItem);
                })
            );

            // Push new files into existing list
            Attachments.push(...newFiles);

            // Update the model AFTER async work is complete
            this.getModel("contractModel").setProperty("/attachments", Attachments);

            console.log("Mapped upload results:", Attachments);
        },
        onBeforeUploadStarts:function(oEvent){
            debugger
        },
        // handleSaveContractBasicInfo: async function () {
        //     const contractMasterData = this.getModel("contractModel").getData();
        //     contractMasterData.attachments = [];
        //     contractMasterData.attribute_values = [];
        //     contractMasterData.status = "Draft";
        //     let oResponse = await this.ODataPost("/Contracts", contractMasterData)
        //     if (oResponse) {
        //         this.getModel("contractModel").setData(oResponse);
        //     }

        // },
        handleSaveandSubmitContractDetails: async function (sSaveType) {
            const contractMasterData = this.getModel("contractModel").getData();
            contractMasterData.attribute_values = this.convertModelDataToAttributeValues();
            if (sSaveType === "save") {
                contractMasterData.status = "Draft";
            }
            else {
                contractMasterData.status = "Submitted";
            }
            let that = this;
            if (!this.contractId) {

                try {

                    const sId = await this.ODataPost("/Contracts", contractMasterData);
                    if (sId) {
                        MessageToast.show("Contract Submitted Successfully.");
                        this.getRouter().navTo("Contracts");
                    }

                } catch (err) {
                    console.error("Create failed:", err);
                    MessageToast.show("Contract creation failed");
                }
            }
            else {
                console.log(this.getAppModulePathBaseURL());
                $.ajax({
                    url: "/contracts/Contracts('" + this.contractId + "')",
                    method: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify(contractMasterData),
                    success: function (data) {
                        console.log(data)
                        MessageBox.success("Contract Submitted Successfully.", {
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    that.getRouter().navTo("Contracts");
                                }
                            }
                        });

                    },
                    error: function (error) {
                        MessageToast.show("Error submitting data");
                    }
                });
            }


        },
        convertModelDataToAttributeValues: function () {
            const modelData = this.getModel("Details").getData();
            const result = [];

            if (!modelData || !Array.isArray(modelData.AttributeGroups)) return result;

            modelData.AttributeGroups.forEach(group => {
                const groupId = group.Attribute_Groups_ID;
                (group.Attributes || []).forEach(attr => {
                    const rawValue = (typeof attr.Value !== "undefined" && attr.Value !== null) ? attr.Value : "";
                    const valueJson = rawValue;

                    result.push({
                        attribute_groups_ID: groupId,
                        attributes_ID: attr.Attribute_ID,
                        valueJson: valueJson
                    });
                });
            });

            return result;
        }

    });
});