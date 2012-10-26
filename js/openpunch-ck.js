function OpenPunch(){var e,t={},n=navigator.userAgent.toLowerCase();_.string.include(n,"iphone")?e="ios":_.string.include(n,"android")?e="android":e="browser";var r=window.openpunch_env,i={session_id:"openpunch:session_id"},s=[{value:"participant",label:"Participants",active:!0},{value:"tutor",label:"Tutors",active:!0},{value:"parent",label:"Parents",active:!0},{value:"guest",label:"Guests",active:!0}],o={dev:"http://127.0.0.1:5000/api/",network:"http://192.168.0.102:5000/api/",staging:"http://dev.openpunchapp.com/api/",live:"https://openpunchapp.com/api/"};JSON.originalParse=JSON.parse;JSON.parse=function(e){if(e)return JSON.originalParse(e)};$.ajaxPrefilter(function(e,t,n){e.url=o[r]+e.url;e.xhrFields={withCredentials:!0};n.setRequestHeader("X-Requested-With","XMLHttpRequest")});var u=Backbone.Model.extend({idAttribute:"_id",parse:function(e){var t;_.each(e,function(n,r){t=r.toLowerCase();_.string.endsWith(t,"id")&&_.isObject(n)?e[r]=n.$oid:_.string.startsWith(t,"dt")&&(e[r]=new XDate(n.$date))});return e}}),a=Backbone.Model.extend({idAttribute:"Id"}),f=u,l=Backbone.Collection.extend(),c=Backbone.Collection.extend({parse:function(e){return e.records}}),h=l,p=Backbone.View.extend({idPrefix:"base-form-view-",submitButtonTemplate:_.template('<input type="submit" class="btn btn-large btn-block btn-primary" value="<%= label %>" />'),submitButtonLabel:"Submit",initialize:function(){_.bindAll(this,"updateSuccess","updateError")},attributes:function(){return{id:this.idPrefix+(this.model?this.model.id:this.cid),"class":this.idPrefix+"page page hide"}},template:function(){return _.template($("#"+this.idPrefix+"template").html())},events:{"click [type=submit]":"commitForm","submit form":"commitForm",keyup:"commitFormOnEnter"},appendSubmit:function(){this.$el.find("form").append(this.submitButtonTemplate({label:this.submitButtonLabel}))},render:function(){this.$el.html(this.template()(_.extend(this.model.toJSON(),t.helpers)));this.$el.find(".form-container").prepend(this.form.render().el);this.appendSubmit();return this},commitFormOnEnter:function(e){e.keyCode===13&&this.commitForm(e)},commitForm:function(e){e.preventDefault();var n=this.form.commit();n||this.model.save(this.form.model.toJSON(),{headers:t.account.reqHeaders(),success:this.updateSuccess,error:this.updateError})},updateSuccess:function(){this.model.trigger("show:modal")},updateError:function(){console.log(arguments)}});t.helpers={eventTime:function(e){return(new XDate(e,!0)).addHours(-5).toString("h:mmtt")},eventDate:function(e){var t=new XDate(!0),n=new XDate(e,!0),r=t.getFullYear(),i=t.getMonth(),s=t.getDate(),o=n.getFullYear(),u=n.getMonth(),a=n.getDate(),f=t.diffDays(n);return f<2&&f>=0?a===s?"Today":"Tomorrow":f>-2&&f<=0?a===s?"Today":"Yesterday":n.addHours(-5).toString("ddd MMM d, yyyy")},eventTitle:function(e){return _.string.prune(e,25)},relativeTime:function(e){var t=new XDate(e,!0),n=new XDate(!0),r=t.diffHours(n),i=t.diffMinutes(n),s=t.diffSeconds(n);return r>12?t.addHours(-5).toString("MMM d '&middot' h:mm tt"):r>1?[Math.round(r),r>2?"hours":"hour","ago"].join(" "):i>1?[Math.round(i),i>2?"mins":"min","ago"].join(" "):s>1?[Math.round(s),s>2?"secs":"sec","ago"].join(" "):"just now"},datePickerFormats:{browser:{date:function(e){return(new XDate(e,!0)).addHours(-5).toString("yyyy-MM-dd")},time:function(e){return(new XDate(e,!0)).addHours(-5).toString("H:mm")},datetime:function(e){return(new XDate(e,!0)).addHours(-5).toString("yyyy-MM-dd HH:mm")}},ios:{date:function(e){return(new XDate(e,!0)).addHours(-5).toString("yyyy-MM-dd")},time:function(e){return(new XDate(e,!0)).addHours(-5).toString("HH:mm")},datetime:function(e){return(new XDate(e,!0)).toISOString()}},android:{date:function(e){return(new XDate(e,!0)).addHours(-5).toString("yyyy-MM-dd")},time:function(e){return(new XDate(e,!0)).addHours(-5).toString("HH:mm")},datetime:function(e){return(new XDate(e,!0)).toISOString()}}},totalHours:function(e){var t=Math.floor(e),n=Math.floor((e-t)*60);return _.string.sprintf("%s h %s m",t,n)},money:function(e){var t=parseFloat(e);return t>=0?_.string.sprintf("$%.2f",t):_.string.sprintf("-$%.2f",Math.abs(t))},simpleDate:function(e){return(new XDate(e,!0)).addHours(-5).toString("MMM d")}};t.Filter=Backbone.Model.extend({idAttribute:"value"});t.Filters=Backbone.Collection.extend({model:t.Filter,localStorage:new Backbone.LocalStorage("openpunch:filters")});t.FilterGroup=Backbone.Model.extend({activeValues:function(){return _.map(this.get("filters").where({active:!0}),function(e){return e.get("value")})},pass:function(e){return _.indexOf(this.activeValues(),e.get(this.get("attr")))!==-1},isActive:function(){return this.get("filters").any(function(e){return e.get("active")===!1})}});t.FilterGroupRoles=t.FilterGroup.extend({defaults:{filters:new t.Filters(s),attr:"role"},initialize:function(){this.get("filters").each(this.syncFilter,this)},syncFilter:function(e){e.fetch({error:function(e,t){t==="Record not found"&&e.save()}})}});t.FilterToggleView=Backbone.View.extend({tagName:"button",attributes:function(){return{"data-toggle":"button","data-value":this.model.get("value"),"class":"filter-button btn btn-block "+(this.model.get("active")?"active btn-success":"")}},events:{click:"toggleFilter"},initialize:function(){_.bindAll(this,"toggleFilter");this.parent=this.options.parent},render:function(){this.$el.text(this.model.get("label"));return this},toggleFilter:function(e){this.model.save("active",!this.model.get("active"));this.$el.toggleClass("btn-success",this.model.get("active"))}});t.Transaction=f.extend({defaults:function(){return{amount:0,side:"c",type:"Subscription Refill"}},ledgerAmount:function(){return this.get("amount")*(this.get("side")==="c"?1:-1)},amountClass:function(){var e=this.ledgerAmount();return e>0?"plus":e<0?"minus":""},pastTransactions:function(){return this.collection.filter(function(e){return new XDate(e.get("dt_add"),!0)<new XDate(this.get("dt_add"),!0)&&e.get("contact_id")===this.get("contact_id")},this)},newBalance:function(){return _.reduce(this.pastTransactions(),function(e,t){return e+t.ledgerAmount()},this.ledgerAmount())},event:function(){return this.get("type")==="Event Fee"&&this.get("event_id")?t.events.get(this.get("event_id")):null}});t.Transactions=h.extend({model:t.Transaction,url:"transactions",comparator:function(e){return-1*(new XDate(e.get("dt_add"),!0)).getTime()}});t.transactions=new t.Transactions;t.Contact=f.extend({defaults:{role:"participant",manager:{}},firstLast:function(){return this.get("first")+" "+this.get("last")},firstLastInitial:function(){return this.get("first")+" "+this.get("last")[0]+"."},actions:function(){return new t.Actions(t.actions.where({contact_id:this.id}))},transactions:function(){return new t.Transactions(t.transactions.where({contact_id:this.id}))},balance:function(){return this.transactions().reduce(function(e,t){return e+t.ledgerAmount()},0)},balanceClass:function(){var e=this.balance();return e>0?"plus":e<0?"minus":""},totalCheckIns:function(){return _.uniq(_.pluck(this.actions().where({status:"in"}),"event_id")).length},totalTime:function(){var e=this.actions().groupBy(function(e){return e.get("event_id")}),n=_.reduce(e,function(e,t){return t.length!==2?e:e+Math.abs((new XDate(t[1].get("dt"),!0)).diffHours(t[0].get("dt")))},0);return t.helpers.totalHours(n)}});t.Contacts=h.extend({model:t.Contact,url:"contacts",comparator:function(e){return e.get("first").toLowerCase()+" "+e.get("last").toLowerCase()}});t.contacts=new t.Contacts;t.Event=f.extend({defaults:{cost:5},parse:function(e){f.prototype.parse.call(this,e);e.attendees=new t.Attendees(e.attendees||[],{event_id:e._id});return e},allActions:function(){return new t.Actions(t.actions.filter(_.bind(function(e){return e.get("event_id")===this.id&&t.contacts.get(e.get("contact_id"))},this)))},status:function(){var e=new XDate(this.get("dt_start"),!0),t=new XDate(this.get("dt_end"),!0),n=new XDate(!0),r=e.diffMinutes(n),i=t.diffMinutes(n);return r<0&&i<0?"future":r>0&&i>0?"past":"live"},totalAttendees:function(){var e=this.allActions().where({status:"in"}),t=_.map(e,function(e){return e.get("contact_id")}),n=_.uniq(t);return n.length},lastAttendeeName:function(){var e=this.allActions();if(e.length>0){var n=e.first().get("contact_id"),r=t.contacts.get(n);if(r)return r.firstLast();console.error("No contact found with id ",n);return"?!"}return"-"}});t.Events=h.extend({model:t.Event,url:"events",defaults:function(){return{attendees:new t.Attendees}},comparator:function(e){return-(new XDate(e.get("dt_start"),!0)).getTime()}});t.events=new t.Events;t.Attendee=f.extend({urlRoot:"attendees",initialize:function(){_.bindAll(this,"updateStatus","updateStatusSuccess","chargeForEvent","chargeForEventSuccess")},actions:function(){return new t.Actions(t.actions.where({event_id:this.get("event_id"),contact_id:this.get("contact_id")}))},latestAction:function(){return this.actions().first()},status:function(){return this.latestAction()?this.latestAction().get("status"):null},isCheckedIn:function(){return this.status()==="in"},isCheckedOut:function(){return this.status()==="out"},updateStatus:function(){t.actions.create({event_id:this.get("event_id"),contact_id:this.get("contact_id"),status:this.isCheckedIn()?"out":"in"},{wait:!0,headers:t.account.reqHeaders(),success:this.chargeForEvent,error:this.updateStatusError})},updateStatusSuccess:function(){console.log("attendee status saved")},updateStatusError:function(e,t){console.error(e);alert("Could not update status")},chargeForEvent:function(e,n){var r=t.transactions.where({event_id:this.get("event_id"),contact_id:this.get("contact_id")});r.length===0&&t.transactions.create({event_id:this.get("event_id"),contact_id:this.get("contact_id"),type:"Event Fee",amount:t.events.get(this.get("event_id")).get("cost"),side:"d"},{wait:!0,headers:t.account.reqHeaders(),success:this.chargeForEventSuccess,error:this.chargeForEventError})},chargeForEventSuccess:function(e,t){console.log("event fee transaction success")},chargeForEventError:function(e,t){console.error(e)}});t.Attendees=h.extend({model:t.Attendee,url:"attendees",initialize:function(e,t){_.each(e,function(e){e.event_id=t.event_id})}});t.Action=f.extend();t.Actions=h.extend({model:t.Action,url:"actions",comparator:function(e){return-1*(new XDate(e.get("dt"),!0)).getTime()}});t.actions=new t.Actions;t.Account=f.extend({urlRoot:"account",reqHeaders:function(){return{"X-OpenPunch-Account-Id":this.id,"X-OpenPunch-Session-Id":this.getSessionId()}},loadData:function(){console.log("fetch all data");var e={headers:this.reqHeaders(),success:function(e,t){console.log("coll fetch success")},error:function(e,n){console.error(n.responseText);t.router.navigate("account/sign-out",{trigger:!0})}};t.events.fetch(e);t.contacts.fetch(e);t.actions.fetch(e);t.transactions.fetch(e)},setSessionId:function(){this.get("session_id")&&localStorage.setItem(i.session_id,this.get("session_id"))},getSessionId:function(){return localStorage.getItem(i.session_id)},clearSessionId:function(){this.unset("session_id",{silent:!0});localStorage.removeItem(i.session_id)}});t.account=new t.Account;t.SignInSchema=Backbone.Model.extend({schema:{email:{title:"Email",validators:["required","email"],fieldClass:"signin-email",editorClass:"span12",dataType:"email"},password:{title:"Password",type:"Password",validators:["required"],fieldClass:"signin-password",editorClass:"span12"}}});t.SignInView=p.extend({el:"#sign-in",idPrefix:"signin-",submitButtonLabel:"Sign In",initialize:function(){p.prototype.initialize.call(this);_.bindAll(this,"signInSuccess","signInError");this.form=new Backbone.Form({model:new t.SignInSchema,idPrefix:"signin-"})},render:function(){this.$el.find(".form-container").html(this.form.render().el);this.appendSubmit();return this},commitForm:function(e){e.preventDefault();this.$el.find(".form-error").addClass("hide");var n=this.form.commit();n||t.account.fetch({data:this.form.model.toJSON(),success:this.signInSuccess,error:this.signInError})},signInSuccess:function(e){console.log("signInSuccess");$(":focus").blur();e.setSessionId();t.router.navigate("loading",{trigger:!0})},signInError:function(e,t){console.log("signInError: "+JSON.stringify(t));this.$el.find(".form-error").text(t.responseText||"Could not sign in").removeClass("hide")}});t.AccountView=Backbone.View.extend({el:"#account",template:_.template($("#account-view-template").html()),initialize:function(){this.model=t.account},render:function(){this.$el.find("#content-account").html(this.template(this.model.toJSON()));return this}});t.LoadingView=Backbone.View.extend({el:"#loading",initialize:function(){this.numLoaded=0;this.numToLoad=4;t.events.on("reset",this.dataFetched,this);t.contacts.on("reset",this.dataFetched,this);t.actions.on("reset",this.dataFetched,this);t.transactions.on("reset",this.dataFetched,this)},dataReady:function(){return this.numLoaded===this.numToLoad},dataFetched:function(e){console.log("collection loaded");this.numLoaded=this.numLoaded+1;this.dataReady()&&t.router.navigate("events",{trigger:!0})}});t.EventsView=Backbone.View.extend({el:"#events",initialize:function(){_.bindAll(this,"renderEvent");t.events.on("reset",this.renderEvents,this);t.events.on("all",function(e){console.log("EventsView",e)},this)},render:function(){this.list=this.$el.find("#events-list").empty();this.renderEvents(t.events);return this},renderEvents:function(e,n){var r=e.groupBy(function(e){return t.helpers.eventDate(e.get("dt_start"))});_.each(r,_.bind(function(e,t,n){this.list.append('<li class="section-title"><h6>'+t+"</h6></li>");_.each(e,this.renderEvent)},this));this.$el.find(".list-placeholder").toggleClass("hide",e.length>0)},renderEvent:function(e){var n=new t.EventLiView({model:e});this.list.append(n.render().el)},showDeleteAlert:function(){this.$el.find(".delete-alert").removeClass("hide");_.delay(_.bind(function(){this.$el.find(".delete-alert").addClass("hide")},this),3e3)}});t.EventLiView=Backbone.View.extend({tagName:"li",template:_.template($("#event-li-view-template").html()),render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers)));return this}});t.EventView=Backbone.View.extend({className:"page event-page",attributes:function(){this.model||t.router.navigate("loading",{trigger:!0});return{id:"event-"+this.model.id}},template:_.template($("#event-view-template").html()),events:{"click .init-scan":"initScan"},initialize:function(){_.bindAll(this,"initScan","scanSuccess","scanError");t.actions.on("add",this.refresh,this)},helpers:function(){return{totalAttendees:this.model.totalAttendees(),lastAttendeeName:this.model.lastAttendeeName(),status:this.model.status()}},refresh:function(e){e.get("event_id")===this.model.id&&this.render()},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));return this},initScan:function(e){window.plugins=window.plugins||{};window.plugins.barcodeScanner?window.plugins.barcodeScanner.scan(this.scanSuccess,this.scanError):alert("Scanning from browser not supported")},scanSuccess:function(e){if(e.cancelled)return!1;this.toggleStatus(e.text);return!0},scanError:function(e){alert("scanning failed: "+e)},toggleStatus:function(e){var n=this.model.get("attendees").where({contact_id:e});if(n.length>0){var r=n[0];r.updateStatus()}else{var i=t.contacts.get(e);i?this.model.get("attendees").create({contact_id:e,event_id:this.model.id},{wait:!0,headers:t.account.reqHeaders(),success:function(e,t){e.updateStatus()},error:function(e,t){console.error(t);alert("Could not toggle status: "+(t.responseText||"unknown error"))}}):alert("Contact with that ID does not exist")}}});t.EventSchema=Backbone.Model.extend({schema:{name:{title:"Name",validators:["required"],fieldClass:"event-name",editorAttrs:{placeholder:"e.g. Volunteer Club"},editorClass:"span12"},dt_start:{title:"Start Date &amp; Time",dataType:"datetime",validators:["required"],fieldClass:"event-startdatetime",editorClass:"span12"},dt_end:{title:"End Date &amp; Time",dataType:"datetime",validators:["required"],fieldClass:"event-enddatetime",editorClass:"span12"},cost:{title:"Cost",validators:["required"],fieldClass:"event-cost",editorClass:"span3 currency",template:"currency"},location:{title:"Location",fieldClass:"event-location",editorAttrs:{placeholder:"e.g. Chicago Ave."},help:"(optional)",editorClass:"span12"},facilitator:{title:"Facilitator",fieldClass:"event-facilitator",editorAttrs:{placeholder:"e.g. Tara Wickey"},help:"(optional)",editorClass:"span12"}}});t.EventSchemaDetail=Backbone.Model.extend({schema:{name:{title:"Name",validators:["required"],fieldClass:"event-name",editorAttrs:{placeholder:"e.g. Volunteer Club"},editorClass:"span12"},dt_start:{title:"Start Date",type:"DateTime",validators:["required"],fieldClass:"event-startdatetime",editorClass:"span12"},dt_end:{title:"End Date",type:"DateTime",validators:["required"],fieldClass:"event-enddatetime",editorClass:"span12"},cost:{title:"Cost",validators:["required"],fieldClass:"event-cost",template:"currency",editorClass:"span3 currency"},location:{title:"Location",fieldClass:"event-location",editorAttrs:{placeholder:"e.g. Chicago Ave."},help:"(optional)",editorClass:"span12"},facilitator:{title:"Facilitator",fieldClass:"event-facilitator",editorAttrs:{placeholder:"e.g. Tara Wickey"},help:"(optional)",editorClass:"span12"}}});t.FormSubmitModalView=Backbone.View.extend({idPrefix:"",attributes:function(){return{id:this.idPrefix+"modal-"+this.model.id,"class":this.idPrefix+"modal modal"}},template:function(){return _.template($("#"+this.idPrefix+"modal-template").html())},events:{"click .dismiss":"dismiss"},initialize:function(){_.bindAll(this,"dismiss");this.model.on("show:modal",this.render,this)},render:function(){this.$el.html(this.template()({_id:this.model.id}));this.$el.modal({show:!0});var e=$(window).scrollTop()+$(window).height()-this.$el.height()-20;this.$el.offset({top:e});return this},dismiss:function(e){this.$el.modal("hide")}});t.EventEditSubmitModal=t.FormSubmitModalView.extend({idPrefix:"event-edit-"});t.EventEditView=p.extend({idPrefix:"event-edit-",submitButtonLabel:"Save Event",initialize:function(){p.prototype.initialize.call(this);e==="ios"?this.form=new Backbone.Form({model:new t.EventSchema({_id:this.model.id,account_id:t.account.id,name:this.model.get("name"),dt_start:t.helpers.datePickerFormats[e].datetime(this.model.get("dt_start")),dt_end:t.helpers.datePickerFormats[e].datetime(this.model.get("dt_end")),cost:this.model.get("cost"),location:this.model.get("location"),facilitator:this.model.get("facilitator")}),idPrefix:"event-"}):this.form=new Backbone.Form({model:new t.EventSchemaDetail({_id:this.model.id,account_id:t.account.id,name:this.model.get("name"),dt_start:(new XDate(this.model.get("dt_start"),!0)).toDate(),dt_end:(new XDate(this.model.get("dt_end"),!0)).toDate(),cost:this.model.get("cost"),location:this.model.get("location"),facilitator:this.model.get("facilitator")}),idPrefix:"event-"});this.modal=new t.EventEditSubmitModal({model:this.model})}});t.EventCreateView=p.extend({idPrefix:"event-create-",submitButtonLabel:"Save New Event",initialize:function(){_.bindAll(this,"eventCreateSuccess");this.model=new t.Event;this.form=new Backbone.Form({model:e==="ios"?new t.EventSchema(this.model.toJSON()):new t.EventSchemaDetail(this.model.toJSON()),idPrefix:"event-"})},commitForm:function(e){e.preventDefault();var n=this.form.commit();n||t.events.create(this.form.model.toJSON(),{headers:t.account.reqHeaders(),success:this.eventCreateSuccess,error:this.eventCreateError})},eventCreateSuccess:function(e){this.form.model.clear();this.form.model.set(t.Event.prototype.defaults);t.router.navigate("events/"+e.id,{trigger:!0})},eventCreateError:function(){console.log(arguments)}});t.EventContactsView=Backbone.View.extend({className:"page full event-contacts-page hide",attributes:function(){this.model||t.router.navigate("loading",{trigger:!0});return{id:"event-contacts-"+this.model.id}},template:_.template($("#event-contacts-view-template").html()),initialize:function(){_.bindAll(this,"renderEventContact")},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers)));this.list=this.$el.find(".contact-list");t.contacts.each(this.renderEventContact);return this},renderEventContact:function(e){var n=this.model.get("attendees").where({contact_id:e.id}),r=n.length>0?n[0]:new t.Attendee({contact_id:e.id,event_id:this.model.id}),i=new t.EventContactLiView({model:e,event:this.model,attendee:r});this.list.append(i.render().el)}});t.EventContactLiView=Backbone.View.extend({tagName:"li",template:_.template($("#event-contact-view-template").html()),events:{click:"toggleStatus"},initialize:function(){_.bindAll(this,"statusIconClass","lastSeenDate","lastSeenLabelClass","toggleStatus");this.event=this.options.event;this.attendee=this.options.attendee;this.attendee.on("change",this.render,this);t.actions.on("add",this.render,this)},statusIconClass:function(){return this.attendee.isCheckedIn()?"icon-ok":this.attendee.isCheckedOut()?"icon-arrow-left":"icon-blank"},lastSeenDate:function(){return this.attendee.latestAction()?t.helpers.relativeTime(this.attendee.latestAction().get("dt")):null},lastSeenLabelClass:function(){return this.attendee.isCheckedIn()?"label-success":""},helpers:function(){return{statusIconClass:this.statusIconClass,lastSeenDate:this.lastSeenDate,lastSeenLabelClass:this.lastSeenLabelClass}},render:function(e){if(e)if(e.get("event_id")!==this.event.id||e.get("contact_id")!==this.model.id)return;this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers(),{attendee:this.attendee.toJSON()})));return this},toggleStatus:function(e){e.preventDefault();this.attendee.actions().length>0?this.attendee.updateStatus():this.event.get("attendees").create(this.attendee.toJSON(),{wait:!0,headers:t.account.reqHeaders(),success:function(e,t){e.updateStatus()},error:function(){console.error(arguments);alert("Could not toggle status")}})}});t.EventHistoryView=Backbone.View.extend({className:"page event-history-page hide",attributes:function(){this.model||t.router.navigate("loading",{trigger:!0});return{id:"event-history-"+this.model.id}},template:_.template($("#event-history-view-template").html()),initialize:function(){_.bindAll(this,"renderEventAction")},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers)));this.list=this.$el.find(".action-list");this.model.allActions().each(this.renderEventAction);this.$el.find(".list-placeholder").toggleClass("hide",this.model.allActions().length>0);return this},renderEventAction:function(e){var n=new t.EventActionLiView({model:e});this.list.append(n.render().el)}});t.EventActionLiView=Backbone.View.extend({tagName:"li",template:_.template($("#event-action-view-template").html()),initialize:function(){_.bindAll(this,"timestamp","timestampLabelClass");this.model.set({contact:t.contacts.get(this.model.get("contact_id")).toJSON()})},timestamp:function(){return t.helpers.relativeTime(this.model.get("dt"))},timestampLabelClass:function(){return this.model.get("status")==="in"?"label-success":"label-important"},helpers:function(){return{timestamp:this.timestamp,timestampLabelClass:this.timestampLabelClass}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));return this}});t.ContactsView=Backbone.View.extend({el:"#contacts",events:{"click #filter-contacts":"toggleFilterDialog","click .filter-button-close":"closeFilters"},initialize:function(){_.bindAll(this,"renderContact");t.contacts.on("reset",this.renderContacts,this);this.rolesFilter=new t.FilterGroupRoles;this.rolesFilter.get("filters").on("change:active",this.toggleFilterNotification,this)},render:function(){this.list=this.$el.find(".contact-list").empty();this.filterContainer=this.$el.find(".filter-container").empty();this.rolesFilter.get("filters").each(this.renderFilter,this);this.toggleFilterNotification();this.renderContacts(t.contacts);return this},renderContacts:function(e,t){this.$el.find(".list-placeholder").toggleClass("hide",e.length>0);e.each(this.renderContact)},renderContact:function(e){var n=new t.ContactLiView({model:e,parent:this});this.list.append(n.render().el)},renderFilter:function(e){var n=new t.FilterToggleView({model:e,parent:this});this.filterContainer.append(n.render().el)},showDeleteAlert:function(){this.$el.find(".delete-alert").removeClass("hide");_.delay(_.bind(function(){this.$el.find(".delete-alert").addClass("hide")},this),3e3)},toggleFilterDialog:function(e){e.preventDefault();$(e.currentTarget).parent().toggleClass("open")},closeFilters:function(e){$(e.currentTarget).parents(".open").removeClass("open")},toggleFilterNotification:function(){this.$el.find("#filter-contacts").toggleClass("btn-warning",this.rolesFilter.isActive())}});t.ContactLiView=Backbone.View.extend({tagName:"li",template:_.template($("#contact-li-view-template").html()),initialize:function(){this.options.parent.rolesFilter.get("filters").on("change:active",this.updateFilter,this)},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers)));this.updateFilter();return this},updateFilter:function(){this.$el.toggleClass("hide",!this.options.parent.rolesFilter.pass(this.model))}});t.ContactView=Backbone.View.extend({className:"page contact-page",template:_.template($("#contact-view-template").html()),attributes:function(){return{id:"contact-"+this.model.id}},helpers:function(){return{firstLast:_.bind(this.model.firstLast,this.model),firstLastInitial:_.bind(this.model.firstLastInitial,this.model),totalCheckIns:_.bind(this.model.totalCheckIns,this.model),totalTime:_.bind(this.model.totalTime,this.model),balance:_.bind(this.model.balance,this.model),balanceClass:_.bind(this.model.balanceClass,this.model)}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));return this}});t.ContactSchema=Backbone.Model.extend({schema:{first:{title:"First name",validators:["required"],fieldClass:"contact-first",editorAttrs:{placeholder:"e.g. Jane"},editorClass:"span12"},last:{title:"Last name",validators:["required"],fieldClass:"contact-last",editorAttrs:{placeholder:"e.g. Smith"},editorClass:"span12"},role:{title:"Role",type:"Select",options:_.pluck(s,"value"),validators:["required"],fieldClass:"contact-role",editorClass:"span12"},managerName:{title:"Account Managers's Name",fieldClass:"contact-manager-name",editorClass:"span12"},managerPhone:{title:"Account Managers's Phone",fieldClass:"contact-manager-phone",editorClass:"span12",dataType:"tel"}}});t.EditContactSubmitModal=t.FormSubmitModalView.extend({idPrefix:"contact-edit-"});t.EditContactView=p.extend({idPrefix:"contact-edit-",submitButtonLabel:"Save Contact",initialize:function(){p.prototype.initialize.call(this);var e=this.model.get("manager");e&&this.model.set({managerName:e.name,managerPhone:e.phone},{silent:!0});this.form=new Backbone.Form({model:new t.ContactSchema(this.model.toJSON()),idPrefix:"contact-"});this.modal=new t.EditContactSubmitModal({model:this.model})}});t.ContactCreateView=p.extend({idPrefix:"contact-create-",submitButtonLabel:"Save New Contact",initialize:function(){_.bindAll(this,"contactCreateSuccess");this.model=new t.Contact;this.form=new Backbone.Form({model:new t.ContactSchema,idPrefix:"contact-"})},commitForm:function(e){e.preventDefault();var n=this.form.commit();n||t.contacts.create(this.form.model.toJSON(),{headers:t.account.reqHeaders(),success:this.contactCreateSuccess,error:this.contactCreateError})},contactCreateSuccess:function(e){t.router.navigate("contacts/"+e.id,{trigger:!0})},contactCreateError:function(){console.log(arguments)}});var d=function(e,t,n){var r={type:e,message:"must be a number"};if(_.isNaN(parseFloat(t)))return r},v=function(e,t,n){var r={type:e,message:"must be more than $0"};if(parseFloat(t)<=0)return r};t.TransactionSchema=Backbone.Model.extend({schema:{type:{title:"Transaction Type",type:"Select",options:["Subscription Refill","Adhoc Charge"],validators:["required"],fieldClass:"transaction-type",editorClass:"span12"},amount:{title:"Amount",validators:["required",_.bind(d,this,"amount"),_.bind(v,this,"amount")],fieldClass:"transaction-amount",editorClass:"span3 currency",template:"currency"},notes:{title:"Notes",type:"TextArea",help:"(optional)",fieldClass:"transaction-notes",editorClass:"span12"}}});t.TransactionCreateView=p.extend({idPrefix:"transaction-create-",submitButtonLabel:"Create Transaction",initialize:function(){_.bindAll(this,"transactionCreateSuccess","transactionCreateError","changeSide");this.model=new t.Transaction({contact_id:this.model.id});this.form=new Backbone.Form({model:new t.TransactionSchema({amount:0}),idPrefix:"transaction-"});this.form.on("type:change",this.changeSide)},changeSide:function(e,t){this.model.set({side:t.getValue()==="Adhoc Charge"?"d":"c"},{silent:!0})},commitForm:function(e){e.preventDefault();var n=this.form.commit();n||t.transactions.create(_.extend(this.options,this.model.toJSON(),this.form.model.toJSON()),{wait:!0,headers:t.account.reqHeaders(),success:this.transactionCreateSuccess,error:this.transactionCreateError})},transactionCreateSuccess:function(e){this.form.model.clear();t.router.navigate("contacts/"+e.get("contact_id")+"/transactions",{trigger:!0});t.router.renderedViews.ContactTransactionsView[e.get("contact_id")].showAddAlert()},transactionCreateError:function(e,n){console.log(n.responseText);t.transactions.remove(t.transactions.getByCid(e.cid))}});t.ContactTransactionsView=Backbone.View.extend({className:"page contact-transactions-page hide",attributes:function(){this.model||t.router.navigate("loading",{trigger:!0});return{id:"contact-transactions-"+this.model.id}},template:_.template($("#contact-transactions-view-template").html()),initialize:function(){_.bindAll(this,"renderContactTransaction")},helpers:function(){return{firstLastInitial:_.bind(this.model.firstLastInitial,this.model)}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));this.list=this.$el.find(".transaction-list");this.model.transactions().each(this.renderContactTransaction);var e=this.model.transactions().length>0;this.$el.find(".list-placeholder").toggleClass("hide",e);this.$el.find(".transaction-list").toggleClass("hide",!e);return this},renderContactTransaction:function(e){var n=new t.ContactTransactionTrView({model:e});this.list.append(n.render().el)},showAddAlert:function(){this.$el.find(".add-alert").removeClass("hide");_.delay(_.bind(function(){this.$el.find(".add-alert").addClass("hide")},this),3e3)}});t.ContactTransactionTrView=Backbone.View.extend({tagName:"tr",template:_.template($("#contact-transaction-tr-view-template").html()),initialize:function(){},helpers:function(){return{ledgerAmount:_.bind(this.model.ledgerAmount,this.model),amountClass:_.bind(this.model.amountClass,this.model),newBalance:_.bind(this.model.newBalance,this.model)}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));return this}});t.ContactHistoryView=Backbone.View.extend({className:"page contact-history-page hide",attributes:function(){this.model||t.router.navigate("loading",{trigger:!0});return{id:"contact-history-"+this.model.id}},template:_.template($("#contact-history-view-template").html()),initialize:function(){_.bindAll(this,"renderContactAction")},helpers:function(){return{firstLastInitial:_.bind(this.model.firstLastInitial,this.model)}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));this.list=this.$el.find(".action-list");this.model.actions().each(this.renderContactAction);this.$el.find(".list-placeholder").toggleClass("hide",this.model.actions().length>0);return this},renderContactAction:function(e){var n=new t.ContactActionLiView({model:e});this.list.append(n.render().el)}});t.ContactActionLiView=Backbone.View.extend({tagName:"li",template:_.template($("#contact-action-view-template").html()),initialize:function(){_.bindAll(this,"timestamp");var e=t.events.get(this.model.get("event_id"));e?this.model.set({event:e.toJSON()}):this.template=!0},timestamp:function(){return t.helpers.relativeTime(this.model.get("dt"))},statusVerb:function(){return this.status==="in"?"into":"out of"},helpers:function(){return{timestamp:this.timestamp,statusVerb:this.statusVerb}},render:function(){this.$el.html(this.template(_.extend(this.model.toJSON(),t.helpers,this.helpers())));return this}});t.Error404=Backbone.View.extend({el:"#error-404"});t.Workspace=Backbone.Router.extend({route:function(e,n,r){return Backbone.Router.prototype.route.call(this,e,n,function(){if(n!=="signIn"&&!t.account.has
("session_id")&&!t.account.id){this.signIn();return!1}r.apply(this,arguments)})},renderedViews:{SignInView:{},AccountView:{},LoadingView:{},EventsView:{},EventCreateView:{},EventView:{},EventEditView:{},EventHistoryView:{},EventContactsView:{},ContactsView:{},ContactCreateView:{},ContactView:{},EditContactView:{},TransactionCreateView:{},ContactTransactionsView:{},ContactHistoryView:{},Error404:{}},pageIsLoaded:function(e,t){t=t||0;return _.has(this.renderedViews[e],t)},renderView:function(e,n,r){if(!this.pageIsLoaded(r,e)){var i=new t[r](n);$("body").append(i.render().el);this.renderedViews[r][e]=i}},renderViews:function(e,n,r){r=r||{};_.each(n,_.bind(function(n){var i=new t[n](r);$("body").append(i.render().el);this.renderedViews[n][e]=i},this))},loadExistingPage:function(e,t){$(".page").addClass("hide");$(".leave-open").removeClass("open");this.renderedViews[t][e].render().$el.removeClass("hide")},loadPage:function(e){e=e||{};var t=_.flatten([e.views]),n=e.id||0,r=e.options||{};_.each(t,_.bind(this.renderView,this,n,r));this.loadExistingPage(n,t[0]);window.scrollTo(0,0)},routes:{"":"signIn",loading:"loading",account:"account","account/sign-in":"signIn","account/sign-out":"signOut",events:"events","events/new":"eventNew","events/:id":"eventDashboard","events/:id/dashboard":"eventDashboard","events/:id/edit":"eventEdit","events/:id/delete":"eventDelete","events/:id/history":"eventHistory","events/:id/contacts":"eventContacts",contacts:"contacts","contacts/new":"contactNew","contacts/:id":"contactDetails","contacts/:id/details":"contactDetails","contacts/:id/edit":"contactEdit","contacts/:id/delete":"contactDelete","contacts/:id/transactions":"contactTransactions","contacts/:id/transactions/new":"transactionNew","contacts/:id/history":"contactHistory",404:"error404"},signIn:function(){console.log("account has session_id?",t.account.has("session_id"));if(t.account.has("session_id")){console.log("account already fetched");t.router.navigate("loading",{trigger:!0})}else{var e=t.account.getSessionId();if(e){console.log("Fetch account using local session id");t.account.fetch({headers:t.account.reqHeaders(),success:function(e,n){t.account.setSessionId();t.router.navigate("loading",{trigger:!0})},error:function(e,n){t.account.clearSessionId();console.log(n.responseText);t.router.navigate("account/sign-in",{trigger:!0})}})}else{console.log("No local session ID. Sign in");this.loadPage({views:"SignInView"})}}},signOut:function(){t.account.clear({silent:!0});t.events.reset([],{silent:!0});t.contacts.reset([],{silent:!0});t.actions.reset([],{silent:!0});t.transactions.reset([],{silent:!0});this.pageIsLoaded("LoadingView")&&(this.renderedViews.LoadingView[0].numLoaded=0);t.account.clearSessionId();t.router.navigate("account/sign-in",{trigger:!0})},account:function(){this.loadPage({views:"AccountView"})},loading:function(){if(this.pageIsLoaded("LoadingView")){var e=this.renderedViews.LoadingView[id];if(e.dataReady())t.router.navigate("events",{trigger:!0});else{this.loadPage({views:"LoadingView"});t.account.loadData()}}else{this.loadPage({views:"LoadingView"});t.account.loadData()}},events:function(){this.loadPage({views:"EventsView"})},eventNew:function(){this.loadPage({views:"EventCreateView"})},eventDashboard:function(e){var n=t.events.get(e);n?this.loadPage({id:e,views:["EventView","EventHistoryView","EventContactsView","EventEditView"],options:{model:n}}):t.router.navigate("404",{trigger:!0})},eventEdit:function(e){this.loadPage({id:e,views:"EventEditView"})},eventDelete:function(e){var n=t.events.get(e);confirm('Delete "'+n.get("name")+"\"? This will also remove the event from each attendee's history.")&&n.destroy({headers:t.account.reqHeaders(),success:_.bind(function(){this.renderedViews.EventsView[0].showDeleteAlert();t.router.navigate("events",{trigger:!0})},this),error:function(e,t){console.error("Could not delete event:",n.get("name"),t);alert("Oops! Could not delete event.")}})},eventHistory:function(e){this.loadPage({id:e,views:"EventHistoryView"})},eventContacts:function(e){this.loadPage({id:e,views:"EventContactsView"})},contacts:function(){this.loadPage({views:"ContactsView"})},contactNew:function(){this.loadPage({views:"ContactCreateView"})},contactDetails:function(e){var n=t.contacts.get(e);n?this.loadPage({id:e,views:["ContactView","ContactTransactionsView","ContactHistoryView","EditContactView","TransactionCreateView"],options:{model:n}}):t.router.navigate("404",{trigger:!0})},contactEdit:function(e){this.loadPage({id:e,views:"EditContactView"})},contactDelete:function(e){var n=t.contacts.get(e);confirm('Delete "'+n.firstLast()+"\"? This will also remove contact from each event's history.")&&n.destroy({headers:t.account.reqHeaders(),success:_.bind(function(){this.renderedViews.ContactsView[0].showDeleteAlert();t.router.navigate("contacts",{trigger:!0})},this),error:function(e,t){console.error("Could not delete contact:",n.firstLast(),t);alert("Oops! Could not delete contact.")}})},transactionNew:function(e){this.loadPage({id:e,views:"TransactionCreateView"})},contactTransactions:function(e){this.loadPage({id:e,views:"ContactTransactionsView"})},contactHistory:function(e){this.loadPage({id:e,views:"ContactHistoryView"})},error404:function(){this.loadPage({views:"Error404"})}});t.router=new t.Workspace;t.router.on("route",function(){if(!t.account.has("session_id")||!t.account.id){t.router.navigate("account/sign-in",{trigger:!0});return!1}});Backbone.history.start()};