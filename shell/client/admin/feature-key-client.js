Template.newAdminFeatureKey.onCreated(function () {
  this.showForm = new ReactiveVar(false);
});

Template.newAdminFeatureKey.helpers({
  currentFeatureKey() {
    return globalDb.currentFeatureKey();
  },

  showForm() {
    const instance = Template.instance();
    return instance.showForm.get();
  },

  hideFormCb() {
    const instance = Template.instance();
    return () => {
      instance.showForm.set(false);
    };
  },
});

Template.adminFeatureKeyDetails.helpers({
  computeValidity: function (featureKey) {
    const nowSec = Date.now() / 1000;
    const expires = parseInt(featureKey.expires);
    if (expires >= nowSec) {
      const soonWindowLengthSec = 60 * 60 * 24 * 7; // one week
      if (expires < (nowSec + soonWindowLengthSec)) {
        return {
          className: "expires-soon",
          labelText: "Expires soon",
        };
      } else {
        return {
          className: "valid",
          labelText: "Valid",
        };
      }
    } else {
      return {
        className: "expired",
        labelText: "Expired",
      };
    }
  },

  renderDateString: function (stringSecondsSinceEpoch) {
    if (stringSecondsSinceEpoch === "18446744073709551615") { // UINT64_MAX means "never expires"
      return "Never";
    }

    // TODO: deduplicate this with the one in shared/shell.js or just import moment.js
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const d = new Date();
    d.setTime(parseInt(stringSecondsSinceEpoch) * 1000);

    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  },
});

Template.featureKeyUploadForm.onCreated(function () {
  this.error = new ReactiveVar(undefined);
  this.text = new ReactiveVar("");
});

Template.featureKeyUploadForm.events({
  "submit form": function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const state = Iron.controller().state;
    const token = state.get("token");

    const instance = Template.instance();
    const text = instance.text.get();
    Meteor.call("submitFeatureKey", token, text, (err) => {
      if (err) {
        instance.error.set(err.message);
      } else {
        instance.error.set(undefined);
        instance.data && instance.data.successCb && instance.data.successCb();
      }
    });
  },

  "change input[type='file']": function (evt) {
    const file = evt.currentTarget.files[0];
    const instance = Template.instance();
    const state = Iron.controller().state;
    const token = state.get("token");
    if (file) {
      // Read the file into memory, then call submitFeatureKey with the file's contents.
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        Meteor.call("submitFeatureKey", token, reader.result, (err) => {
          if (err) {
            instance.error.set(err.message);
          } else {
            instance.data && instance.data.successCb && instance.data.successCb();
          }
        });
      });
      reader.readAsText(file);
    }
  },

  "input textarea"(evt) {
    const instance = Template.instance();
    instance.text.set(evt.currentTarget.value);
  },
});

Template.featureKeyUploadForm.helpers({
  currentError: function () {
    return Template.instance().error.get();
  },

  text() {
    return Template.instance().text.get();
  },

  disabled() {
    return !Template.instance().text.get();
  },
});

Template.adminFeatureKeyModifyForm.onCreated(function () {
  this.showForm = new ReactiveVar(undefined);
});

Template.adminFeatureKeyModifyForm.helpers({
  showUpdateForm() {
    return Template.instance().showForm.get() === "update";
  },

  showDeleteForm() {
    return Template.instance().showForm.get() === "delete";
  },

  token() {
    const state = Iron.controller().state;
    return state.get("token");
  },

  hideFormCb: function () {
    const instance = Template.instance();
    return () => {
      instance.showForm.set(undefined);
    };
  },
});

Template.adminFeatureKeyModifyForm.events({
  "submit .feature-key-modify-form"(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    Template.instance().showForm.set("update");
  },

  "click button.feature-key-delete-button"(evt) {
    Template.instance().showForm.set("delete");
  },
});

Template.featureKeyDeleteForm.events({
  "submit .feature-key-delete-form"(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const instance = Template.instance();
    Meteor.call("submitFeatureKey", instance.data.token, null, (err) => {
      if (err) {
        console.error("Couldn't delete feature key");
      } else {
        instance.data.successCb && instance.data.successCb();
      }
    });
  },

  "click button.cancel"(evt) {
    const instance = Template.instance();
    instance.data.cancelCb && instance.data.cancelCb();
  },
});
