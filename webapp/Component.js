sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/demo/customer/customerui5/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.demo.customer.customerui5.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            var oData = {
                customers: [
                    {
                        CustomerID: "100001",
                        Name: "Tom",
                        City: "Tokyo",
                        Phone: "090-1111-1111"
                    },
                    {
                        CustomerID: "100002",
                        Name: "Jack",
                        City: "Osaka",
                        Phone: "090-2222-2222"
                    },
                    {
                        CustomerID: "100003",
                        Name: "Mary",
                        City: "Nagoya",
                        Phone: "090-3333-3333"
                    }
                ]
            };

            var oModel = new sap.ui.model.json.JSONModel(oData);
            this.setModel(oModel, "local");

            // enable routing
            this.getRouter().initialize();
        }
    });
});