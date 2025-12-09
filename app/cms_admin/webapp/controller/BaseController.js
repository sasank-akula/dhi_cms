sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Link",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"
], function (Controller, Link, Fragment, MessageBox) {
    "use strict";

    return Controller.extend("com.dhi.cms.cmsadmin.controller.BaseController", {

        /**
         * Convenience method for accessing the controrls
         * @param {string} sId - ID of the Control
         * @returns sap.ui.core.Control
         */
        // byId: function(sId) {
        //     return this.getView().byId(sId);
        // },

        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Convenience method for getting the fragment by id in every controller of the application.
         * @public
         * @returns {string} the unique ID for the fragment
         */
        _getFragmentId: function (sComponentId, sViewName, sFragmentName) {
            return sComponentId + `---${sViewName}--${sFragmentName}`;
        },

        onNavigation: async function (sNavigationTarget) {
            var oRouter = this.getOwnerComponent().getRouter();
            var sNavigationTarget;
            if (sNavigationTarget) {
                await oRouter.navTo(sNavigationTarget);
            } else {
                console.error("Navigation target not defined.");
            }
        },

        onRulesNavigation: function () {
            window.open("https://development-aarini.cockpit.workflowmanagement.cfapps.eu10.hana.ondemand.com/comsapbpmrule.ruleeditor/index.html#/Projects");
        },

        /**
         * Updates the breadcrumbs based on the current navigation
         * @private
         * @param {string} sNavigationTarget the navigation target
         */
        // : function (sNavigationTarget) {
        //     var sComponentId = this.getOwnerComponent().getId();
        //     var oBreadcrumbs = Fragment.byId(this._getFragmentId(sComponentId, "App", "ToolPageHeader"), "breadcrumbs");
        //     if (!oBreadcrumbs) {
        //         console.error("Breadcrumbs control not found.");
        //         return;
        //     }
        //     var that = this;
        //     var i18nModel = this.getView().getModel("i18n");
        //     var i18nBundle = i18nModel ? i18nModel.getResourceBundle() : null;
        //     if (!i18nBundle) {
        //         console.error("i18n resource bundle not found.");
        //         return;
        //     }
        //     var aMainSections = ["Dashboard", "Products", "Attributes", "Attribute Groups", "Templates", "Catalogue"];
        //     var oSubPageMapping = {
        //         "Create Products": "Products",
        //         "Create Attributes": "Attributes",
        //         "Create Attribute Group": "Attribute Groups",
        //         "Create Template": "Templates",
        //         "Create Catalogue": "Catalogue"
        //     };
        //     var getTranslatedText = function (key) {
        //         return i18nBundle.getText("Breadcrumbs_" + key.replace(/\s/g, "_"), key);
        //     };
        //     var aNewBreadcrumbs = [];
        //     var sLastBreadcrumbText = "";
        //     // Check if editing an existing item using appModel
        //     var isEditMode = this.getModel("appModel").getProperty("/isEditMode");
        //     // First breadcrumb (Prodsphere)
        //     aNewBreadcrumbs.push(new Link({
        //         text: "Prodsphere",
        //         press: function () {
        //             that.getRouter().navTo("Dashboard");
        //         }
        //     }));
        //     if (sNavigationTarget === "Dashboard") {
        //         sLastBreadcrumbText = getTranslatedText("Dashboard");
        //     } else {
        //         var sMainSection = aMainSections.find(section => sNavigationTarget.includes(section));
        //         var sParentSection = oSubPageMapping[sNavigationTarget];
        //         // Avoid duplicate breadcrumbs for main sections
        //         if (sParentSection) {
        //             aNewBreadcrumbs.push(new Link({
        //                 text: getTranslatedText(sParentSection),
        //                 press: function () {
        //                     that.getRouter().navTo(sParentSection);
        //                 }
        //             }));
        //         } else if (sMainSection && sMainSection !== sNavigationTarget) {
        //             aNewBreadcrumbs.push(new Link({
        //                 text: getTranslatedText(sMainSection),
        //                 press: function () {
        //                     that.getRouter().navTo(sMainSection);
        //                 }
        //             }));
        //         }
        //         // Set last breadcrumb text based on edit mode
        //         if (isEditMode) {
        //             if (sNavigationTarget === "Create Products") {
        //                 sLastBreadcrumbText = getTranslatedText("Update Product");
        //             } else if (sNavigationTarget === "Create Attributes") {
        //                 sLastBreadcrumbText = getTranslatedText("Update Attribute");
        //             } _updateBreadcrumbselse if (sNavigationTarget === "Create Attribute Group") {
        //                 sLastBreadcrumbText = getTranslatedText("Update Attribute Group");
        //             } else if (sNavigationTarget === "Create Template") {
        //                 sLastBreadcrumbText = getTranslatedText("Update Template");
        //             } else if (sNavigationTarget === "Create Catalogue") {
        //                 sLastBreadcrumbText = getTranslatedText("Update Catalogue");
        //             } else {
        //                 sLastBreadcrumbText = getTranslatedText(sNavigationTarget);
        //             }
        //         } else {
        //             sLastBreadcrumbText = getTranslatedText(sNavigationTarget);
        //         }
        //     }
        //     // Remove existing breadcrumbs and add new ones except last one
        //     oBreadcrumbs.removeAllLinks();
        //     aNewBreadcrumbs.forEach(oLink => oBreadcrumbs.addLink(oLink));
        //     oBreadcrumbs.setCurrentLocationText(sLastBreadcrumbText);
        //     // Reset edit mode flag after setting breadcrumbs
        //     this.getModel("appModel").setProperty("/isEditMode", false);
        // },

        confirmAction: function (sMessage, actions) {
            let promise = new Promise((resolve, reject) => {
                let defaultactions = [MessageBox.Action.YES, MessageBox.Action.NO];
                if (actions) {
                    defaultactions = actions;
                }
                MessageBox.confirm(sMessage, {
                    actions: defaultactions,
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.YES) {
                            resolve(sAction);
                        }
                    },
                    dependentOn: this.getView()
                });
            });
            return promise;
        },

        /**
       * Register message manager specific to the view
       * @private 
       * @memberof com.pimx.prodsphere.pxm
       */
        _fnRegisterMessageManager: function () {
            sap.ui
                .getCore()
                .getMessageManager()
                .registerObject(this.getView(), true);
            var oMessagesModel = sap.ui
                .getCore()
                .getMessageManager()
                .getMessageModel();
            this.getView().setModel(oMessagesModel, "message");
        },

        _refreshMessageManager: function () {
            sap.ui.getCore().getMessageManager().getMessageModel().setData([]);
            sap.ui.getCore().getMessageManager().getMessageModel().refresh();
            this.getModel("message").setData([]);
            this.getModel("message").refresh();
        },

        getBusyDialog: function () {
            if (!this._oBusyDialog) {
                this._oBusyDialog = sap.ui.xmlfragment(this.getView().getController().createId("busyDialogId"),
                    "com.pimx.prodsphere.pxm.fragments.BusyDialog",
                    this);
                this.getView().addDependent(this._oBusyDialog);
            }
            return this._oBusyDialog;
        },

        getAppModulePathBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);

            return appModulePath;
        },

        /**
         * Convenience method for retrieving a translatable text.
         * @param {string} sTextId - the ID of the text to be retrieved.
         * @param {Array} [aArgs] - optional array of texts for placeholders.
         * @returns {string} the text belonging to the given ID.
         */
        getText: function (sTextId, aArgs) {
            let oBundle = this.getResourceBundle();
            return oBundle.getText(sTextId, aArgs);
        },

    });

});