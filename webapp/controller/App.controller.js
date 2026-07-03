sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], (Controller, MessageToast, Fragment, JSONModel,
    MessageBox, Filter, FilterOperator, Sorter) => {
    "use strict";

    return Controller.extend("com.demo.customer.customerui5.controller.App", {

        onInit() {
        
            this._oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        
            var oViewModel = new JSONModel({
                editMode: false,
                isCreate: false,
            
                nameState: "None",
                cityState: "None",
                phoneState: "None",
                phoneStateText: "",
            
                sortDescending: false,
                sortPath: "",
            
                hasSelection: false,
            
                sortButtonText: this._oResourceBundle.getText("sortButton"),
                sortButtonIcon: "sap-icon://sort",
            
                busy: false
            });
            this.getView().setModel(oViewModel, "view");
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("query");
            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            if (sValue) {
                var oFilter = new Filter({
                    filters: [
                        new Filter("Name", FilterOperator.Contains, sValue),
                        new Filter("City", FilterOperator.Contains, sValue),
                        new Filter("Phone", FilterOperator.Contains, sValue)
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
        
            oBinding.filter([]);
            this.byId("sfCustomer").setValue("");
        },

        async onItemPress(oEvent) {

            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sId = oContext.getProperty("ID");

            this._createEditModel(oContext);

            await this._ensureCustomerDialog();
            this._oCustomerDialog.setBindingContext(oContext);
            this._oCustomerDialog.setTitle(this._oResourceBundle.getText("dialogTitleDetail", [sId]));
            this._oCustomerDialog.open();
        },

        onCloseDialog: function () {
            this._oCustomerDialog.close();
        },

        onEdit: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/editMode", true);
        },

        async onSave() {        
            if (!this._validateAll()) {
                return;
            }
        
            this._setBusy(true);        
            var oViewModel = this.getView().getModel("view");
        
            try {
                if (oViewModel.getProperty("/isCreate")) {
                    await this._createCustomer();
                } else {
                    await this._updateCustomer();
                }
            
                this._oCustomerDialog.close();
                MessageToast.show(this._oResourceBundle.getText("msgSaveSuccess"));
            
            } catch (oError) {
                MessageBox.error(oError.message || this._oResourceBundle.getText("msgSaveError"));
            } finally {
                this._setBusy(false);
            }
        },

        onCancel: function () {

            if (this._isDirty()) {
                this._confirmDiscard(function () {
                    this._doCancel();
                }.bind(this));
            } else {
                this._doCancel();
            }
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

        async onAdd() {
            var oNewCustomer = {
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
            this._oCustomerDialog.setBindingContext(null);
            this._oCustomerDialog.setTitle(this._oResourceBundle.getText("dialogTitleCreate"));
            this._oCustomerDialog.open();
        },

        onSortSelect: function (oEvent) {

            var oMenuItem = oEvent.getSource();
            var sSortPath = oMenuItem.data("sortPath");
            var sSortLabel = oMenuItem.data("sortLabel");
                
            if (!sSortPath) {
                return;
            }
        
            var oViewModel = this.getView().getModel("view");
            var sCurrentPath = oViewModel.getProperty("/sortPath");
            var bDescending = oViewModel.getProperty("/sortDescending");
        
            if (sCurrentPath === sSortPath) {
                bDescending = !bDescending;
            } else {
                bDescending = false;
            }
        
            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");
            var oSorter = new Sorter(sSortPath, bDescending);
        
            oBinding.sort(oSorter);
        
            oViewModel.setProperty("/sortPath", sSortPath);
            oViewModel.setProperty("/sortDescending", bDescending);
        
            var sPrefix = this._oResourceBundle.getText("sortButton");
            oViewModel.setProperty("/sortButtonText", sPrefix + ": " + sSortLabel);
            oViewModel.setProperty(
                "/sortButtonIcon",
                bDescending ? "sap-icon://sort-descending" : "sap-icon://sort-ascending"
            );
        
            var sDirectionKey = bDescending ? "sortDescending" : "sortAscending";
        
            MessageToast.show(
                this._oResourceBundle.getText("msgSortApplied", [
                    sSortLabel,
                    this._oResourceBundle.getText(sDirectionKey)
                ])
            );
        },
        
        onSortClear: function () {
        
            var oViewModel = this.getView().getModel("view");
        
            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");
        
            oBinding.sort(null);
        
            oViewModel.setProperty("/sortPath", "");
            oViewModel.setProperty("/sortDescending", false);
            oViewModel.setProperty("/sortButtonText", this._oResourceBundle.getText("sortButton"));
            oViewModel.setProperty("/sortButtonIcon", "sap-icon://sort");
        
            MessageToast.show(this._oResourceBundle.getText("msgSortCleared"));
        },

        onDelete: function () {
            MessageBox.confirm(
                this._oResourceBundle.getText("msgDeleteConfirm"),
                {
                    title: this._oResourceBundle.getText("msgDeleteConfirmTitle"),
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._deleteCustomer();
                        }
                    }.bind(this)
                }
            );
        },

        onSelectionChange: function () {
            var oTable = this.byId("tblCustomer");
            var aSelectedItems = oTable.getSelectedItems();
            var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/hasSelection", aSelectedItems.length > 0);
        },

        onDeleteSelected: function () {
        
            var oTable = this.byId("tblCustomer");
            var aSelectedItems = oTable.getSelectedItems();
        
            if (aSelectedItems.length === 0) {
                return;
            }
        
            var aSelectedContexts = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext();
            });
        
            var aSelectedIds = aSelectedContexts.map(function (oContext) {
                return oContext.getProperty("ID");
            });
        
            var sConfirmText = aSelectedItems.length === 1
                ? this._oResourceBundle.getText("msgDeleteConfirm")
                : this._oResourceBundle.getText("msgDeleteConfirmMulti", [aSelectedItems.length]);
        
            MessageBox.confirm(
                sConfirmText,
                {
                    title: this._oResourceBundle.getText("msgDeleteConfirmTitle"),
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._setBusy(true);
                        
                            this._deleteCustomersByIds(aSelectedIds, aSelectedContexts)
                                .then(function () {
                                    oTable.removeSelections(true);
                                    this.getView().getModel("view").setProperty("/hasSelection", false);
                                }.bind(this))
                                .catch(function (oError) {
                                    MessageBox.error(oError.message);
                                })
                                .finally(function () {
                                    this._setBusy(false);
                                }.bind(this));
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

        _deleteCustomersByIds: async function (aIds, aContexts) {
        
            var aDeletePromises = aContexts.map(function (oContext) {
                return oContext.delete();
            });
        
            await Promise.all(aDeletePromises);
        
            var sMsg = aIds.length === 1
                ? this._oResourceBundle.getText("msgDeleteSuccess")
                : this._oResourceBundle.getText("msgDeleteSuccessMulti", [aIds.length]);
        
            MessageToast.show(sMsg);
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
            var oViewModel = this.getView().getModel("view");

            if (!sPhone || sPhone.trim() === "") {
                oViewModel.setProperty("/phoneState", "Error");
                oViewModel.setProperty("/phoneStateText", this._oResourceBundle.getText("msgFieldRequired"));
                return false;
            }

            // 日本の電話番号形式（固定電話・携帯電話両対応）例: 090-1234-5678 / 03-1234-5678
            var rPhonePattern = /^0\d{1,4}-\d{1,4}-\d{4}$/;

            if (!rPhonePattern.test(sPhone)) {
                oViewModel.setProperty("/phoneState", "Error");
                oViewModel.setProperty("/phoneStateText", this._oResourceBundle.getText("msgPhoneInvalid"));
                return false;
            }

            oViewModel.setProperty("/phoneState", "None");
            oViewModel.setProperty("/phoneStateText", "");
            return true;
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

        _resetDialogState: function () {
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

        _createCustomer: function () {
        
            var oTable = this.byId("tblCustomer");
            var oBinding = oTable.getBinding("items");
            var oEditModel = this.getView().getModel("edit");
            var oNewData = oEditModel.getData();
        
            var oContext = oBinding.create(oNewData);
        
            return oContext.created();
        },

        _updateCustomer: function () {
        
            var oContext = this._oCustomerDialog.getBindingContext();
            var oEditModel = this.getView().getModel("edit");
            var oEditData = oEditModel.getData();
        
            var oModel = this.getView().getModel();
        
            oContext.setProperty("Name", oEditData.Name);
            oContext.setProperty("City", oEditData.City);
            oContext.setProperty("Phone", oEditData.Phone);
        
            return oModel.submitBatch("$auto");
        },

        _deleteCustomer: function () {
        
            var oContext = this._oCustomerDialog.getBindingContext();
            var sId = oContext.getProperty("ID");
        
            this._setBusy(true);
        
            this._deleteCustomersByIds([sId], [oContext])
                .then(function () {
                    this._oCustomerDialog.close();
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error(oError.message);
                })
                .finally(function () {
                    this._setBusy(false);
                }.bind(this));
        },

        _doCancel: function () {

            var oViewModel = this.getView().getModel("view");

            // Createモード：クローズ
            if (oViewModel.getProperty("/isCreate")) {
                this.onCloseDialog();
                return;
            }

            // Editモード：元のデータに戻す
            var oContext = this._oCustomerDialog.getBindingContext();
            this._createEditModel(oContext);

            this._resetDialogState();
        },

        _isDirty: function () {

            var oViewModel = this.getView().getModel("view");
            var oEditModel = this.getView().getModel("edit");
            var oEditData = oEditModel.getData();

            // Createモード：いずれかのフィールドに入力が行われている場合、未保存の変更があるものとみなされます。
            if (oViewModel.getProperty("/isCreate")) {
                return !!(oEditData.Name || oEditData.City || oEditData.Phone);
            }

            // Editモード：ソースデータと項目ごとに比較する
            var oContext = this._oCustomerDialog.getBindingContext();
            var oOriginalData = oContext.getObject();

            return oEditData.Name !== oOriginalData.Name ||
                oEditData.City !== oOriginalData.City ||
                oEditData.Phone !== oOriginalData.Phone;
        },

        _confirmDiscard: function (fnConfirmed) {

            var oBundle = this._oResourceBundle;
            var sDiscardText = oBundle.getText("btnDiscard");
            var sKeepEditingText = oBundle.getText("btnKeepEditing");

            MessageBox.warning(
                oBundle.getText("msgUnsavedChangesConfirm"),
                {
                    title: oBundle.getText("msgUnsavedChangesTitle"),
                    actions: [sDiscardText, sKeepEditingText],
                    emphasizedAction: sKeepEditingText,
                    onClose: function (sAction) {
                        if (sAction === sDiscardText) {
                            fnConfirmed();
                        }
                    }
                }
            );
        },

        _setBusy: function (bBusy) {
            this.getView().getModel("view").setProperty("/busy", bBusy);
        }

    });
});