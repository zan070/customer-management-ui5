sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, MessageToast, Fragment, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("com.demo.customer.customerui5.controller.App", {

        onInit() {
        
            var oViewModel = new JSONModel({
                editMode: false,
                isCreate: false,
                nameState: "None",
                cityState: "None",
                phoneState: "None"
            });
            this.getView().setModel(oViewModel, "view");
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("query");
            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            if (sValue) {
                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("CustomerID", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("City", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("Phone", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
            
                aFilters.push(oFilter);
            }
            oBinding.filter(aFilters);
        },

        onReset: function () {

            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");

            // クリアフィルター
            oBinding.filter([]);

            // クリア検索フィールド
            this.byId("sfCustomer").setValue("");
        },

        async onItemPress(oEvent) {
        
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("local");
            var sId = oContext.getProperty("CustomerID");
        
            this._createEditModel(oContext);

            await this._ensureCustomerDialog();      
            this._oCustomerDialog.setBindingContext(oContext, "local");
            this._oCustomerDialog.setTitle("Customer Detail - " + sId);
            this._oCustomerDialog.open();
        },

        onCloseDialog: function () {
            this._oCustomerDialog.close();
        },

        onEdit: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/editMode", true);
        },

        onSave: function () {
            // 入力チェック,（空白の場合、枠は赤くなる）
            if (!this._validateAll()) {
                return;
            }

            var oViewModel = this.getView().getModel("view");

                if (oViewModel.getProperty("/isCreate")) {
                    this._createCustomer();
                } else {
                    this._updateCustomer();
                }

            // 編集モードを終了し、ビューモードに戻す
            this._oCustomerDialog.close();
            MessageToast.show("Saved successfully.");
        },

        onCancel: function () {
            var oViewModel = this.getView().getModel("view");
            var oContext = this._oCustomerDialog.getBindingContext("local"); 
            //編集モードでのみコンテキストを取得
            if (!oViewModel.getProperty("/isCreate")) {
                this._createEditModel(oContext);
            };
            this._resetDialogState();
        },
   
        onNameLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            this._validateName(sValue);
        },

        onCityLiveChange: function (oEvent) { 
            var sValue = oEvent.getParameter("value");
            this._validateCity(sValue);
        },

        onPhoneLiveChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            this._validatePhone(sValue);
        },

        onDialogAfterClose: function () {
            this._resetDialogState();
        },

        async onAdd(){
            var oNewCustomer = {
                CustomerID: "",
                Name: "",
                City: "",
                Phone: ""
            };

            var oEditModel = new JSONModel(oNewCustomer);

            this.getView().setModel(oEditModel, "edit");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/editMode", true);
            oViewModel.setProperty("/isCreate", true);

            await this._ensureCustomerDialog();
            this._oCustomerDialog.setTitle("Create Customer");
            this._oCustomerDialog.open();
        },

        onDelete: function () {
            MessageBox.confirm(
            "Delete this customer?",
                {
                    title: "Confirm",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                        this._deleteCustomer();
                        }
                    }.bind(this)
                }
            );
        },
//------------------------------------------------------------------------------------------

        _validateRequiredField: function (sValue, sStateProperty) {
            var oViewModel = this.getView().getModel("view"); 

            if (!sValue || sValue.trim() === "") { 
                oViewModel.setProperty("/" + sStateProperty, "Error"); 
                return false; 
            } 
            oViewModel.setProperty("/" + sStateProperty, "None"); 
            return true; 
        },

        _createEditModel: function (oContext) {
            var oData = Object.assign({}, oContext.getObject());
            var oEditModel = new JSONModel(oData);
            this.getView().setModel(oEditModel, "edit");
        },

        _validateName: function (sName) { 
            return this._validateRequiredField(sName, "nameState"); 
        },

        _validateCity: function (sCity) {
            return this._validateRequiredField(sCity, "cityState"); 
        },

        _validatePhone: function (sPhone) {
            return this._validateRequiredField(sPhone, "phoneState"); 
        },

        _validateAll: function () {
            var oEditModel = this.getView().getModel("edit"); 
            var bValid = true;

            if (!this._validateName(oEditModel.getProperty("/Name"))) {
                bValid = false;
            }

            if (!this._validateCity(oEditModel.getProperty("/City"))) {
                bValid = false;
            }

            if (!this._validatePhone(oEditModel.getProperty("/Phone"))) {
                bValid = false;
            }

                return bValid;
        },

        _resetValidation: function () {
           var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/nameState", "None");
            oViewModel.setProperty("/cityState", "None");
            oViewModel.setProperty("/phoneState", "None");
        },

        _resetDialogState: function() {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/editMode", false);
            oViewModel.setProperty("/isCreate", false);
            this._resetValidation();
        },

        _ensureCustomerDialog: async function () {

            if (!this._oCustomerDialog) {

                this._oCustomerDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.demo.customer.customerui5.fragment.CustomerDialog",
                    controller: this
                });
            
                this.getView().addDependent(this._oCustomerDialog);
            }
        },

        _generateCustomerId: function () {

            var oLocalModel = this.getView().getModel("local");
            var aCustomers = oLocalModel.getProperty("/customers");
            if (aCustomers.length === 0) {
                return "100001";
            }
        
            var sLastId = aCustomers[aCustomers.length - 1].CustomerID;
            var iNumber = parseInt(sLastId, 10);
            iNumber++;
        
            return String(iNumber);
        },

        _createCustomer: function () {
            var oLocalModel = this.getView().getModel("local");
            var oEditModel = this.getView().getModel("edit");

            var aCustomers = oLocalModel.getProperty("/customers");
            var oNewCustomer = oEditModel.getData();
            oNewCustomer.CustomerID = this._generateCustomerId();
            aCustomers.push(oNewCustomer);
            oLocalModel.refresh(true);
        },

        _updateCustomer: function () {
            var oContext = this._oCustomerDialog.getBindingContext("local"); 
            var sPath = oContext.getPath(); 

            var oLocalModel = this.getView().getModel("local");
            var oEditModel = this.getView().getModel("edit");
            oLocalModel.setProperty(sPath, oEditModel.getData());
        },

        _deleteCustomer: function () {
            var oContext = this._oCustomerDialog.getBindingContext("local");
            var sPath = oContext.getPath();

            var oLocalModel = this.getView().getModel("local");
            var aCustomers = oLocalModel.getProperty("/customers");
            var iIndex = parseInt(sPath.split("/")[2], 10);

            aCustomers.splice(iIndex, 1);
            oLocalModel.refresh(true);

            this._oCustomerDialog.close();
            MessageToast.show("Deleted successfully.");
        },

    });
});