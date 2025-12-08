sap.ui.define([
     "./BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
], (BaseController,Controller, MessageBox) => {
    "use strict";

    return BaseController.extend("com.dhi.cms.cmsrequester.controller.ContractDetails", {
        onInit() {
            this.getRouter().getRoute("ContractDetails").attachPatternMatched(this._onObjectMatched, this);

        },
        _onObjectMatched: function (oEvent) {
            this._SelectedContractType;
            const oArgs = oEvent.getParameter("arguments");
            this.contractId = oArgs.contractId;
            const sRouteName = oEvent.getParameter("name");
            const isEditMode = !!this.contractId;
            if (!this.contractId) {
                this._initializeContractMasters();
            }

            // this._initializeViewState(oEvent, isEditMode, sRouteName);

            this._focusOnBasicInfoTab();
            // this._loadTenantData();
        },
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
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
        _initializeViewState: function (oEvent, isEditMode, sRouteName) {
            this.getModel("appModel").setProperty("/isEditMode", isEditMode);
            // this.oItemsProcessor = [];
            // this.documentTypes = this.getFileCategories();
            // this._updateBreadcrumbs(sRouteName);
            // this._fnRegisterMessageManager();
            this._handleProductData(oEvent);
        },
        _focusOnBasicInfoTab: function () {
            const oIconTabBar = this.byId("iconTabBar");
            oIconTabBar.setSelectedKey("BasicInfo");

            // oIconTabBar.getItems().forEach((oTab) => {
            //     const oTabDomRef = oTab.getDomRef();
            //     if (oTabDomRef) {
            //         $(oTabDomRef).removeClass("sapMITBSelected sapMITBFocused");
            //     }
            // });

            const oBasicInfoTab = oIconTabBar.getItems()[0].getDomRef();
            if (oBasicInfoTab) {
                oBasicInfoTab.focus();
            }
        },
        onTabSelect: function (oEvent) {
            let sSelectedKey = oEvent.getParameters().selectedKey;
            let sSelectedContractType = this.byId("contractTypeSelect").getSelectedKey();
            if (!this.byId("contractTypeSelect").getSelectedKey()) {

                oEvent.getSource().setSelectedKey("BasicInfo")
                MessageBox.warning("Please select the Contract Type")
                return;
            }
            if (sSelectedKey != "BasicInfo") {
                if (this._SelectedContractType
                    != sSelectedContractType) {
                    this.initializeDetails();
                }
                // else {
                //     oEvent.getSource().setSelectedKey("BasicInfo")
                //     MessageBox.warning("Please select the Contract Type")
                // }
            }
            this._SelectedContractType = sSelectedContractType;

        },
        initializeDetails: function () {
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

                // 4) Transform flat rows -> grouped model { AttributeGroups: [ { Attributes: [...] } ] }
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

                    // normalize attribute row to a shape your factory expects
                    const attr = {
                        Attribute_ID: row.Attribute_ID,
                        Attribute_Name: row.Attribute_Name,
                        AttributeOrder: row.AttributeOrder || 0,
                        IsMandatory: !!row.Is_Required,
                        AttributeType: row.AttributeType || "String",           // if your CDS supplies type, use it
                        AttributeValue: row.AttributeValue || "",               // CSV or array for combobox options
                        AttributeTypeAssociation: row.AttributeTypeAssociation || [], // associations if any
                        Value: row.Value || "",                                 // currently stored value (if present)
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
        onUploadCompleted: function (oEvent) {
            let vItem = oEvent.getParameters().item;
            let Attachments = this.getOwnerComponent().getModel("contractModel").getProperty("/attachments");
            // Normalize to array
            let aItems = Array.isArray(vItem) ? vItem : [vItem];

            // Extract mapped properties for each uploaded file
            aItems.map(function (oItem) {
                Attachments.push({
                    fileName: oItem.getFileName(),
                    mediaType: oItem.getMediaType ? oItem.getMediaType() : oItem.mProperties.mediaType,
                    fileSize: oItem.getFileSize ? oItem.getFileSize() : oItem.mProperties.fileSize,
                    uploadState: oItem.getUploadState ? oItem.getUploadState() : oItem.mProperties.uploadState,
                    uploadedOn:
                        (oItem.getUploadedOn && oItem.getUploadedOn()) ||
                        oItem.mProperties.uploadedOn ||
                        null
                })
            });

            console.log("Mapped upload results:", Attachments);
            this.getOwnerComponent().getModel("contractModel").setProperty("/attachments", Attachments)
            // inspect in browser dev tools
        },
        handleSaveContractBasicInfo:async function(){
            const contractMasterData=this.getModel("contractModel").getData();
            contractMasterData.attachments=[];
            contractMasterData.attribute_values=[];
            contractMasterData.status="Draft";
            let oResponse=await this.ODataPost("/Contracts",contractMasterData)
            this.getModel("contractModel").setData(oResponse);
            
        }

    });
});