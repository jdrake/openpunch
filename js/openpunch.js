
function OpenPunch() {

  // Set OS
  var os
    , self = {}
    , ua = navigator.userAgent.toLowerCase();

  if (_.string.include(ua, "iphone"))
    os = "ios";
  else if (_.string.include(ua, "android"))
    os = "android";
  else
    os = "browser";

  // Set locals
  var env = window.openpunch_env || 'live'
    , hashes = {
      session_id: 'openpunch:session_id'
    }
    , roles = [
      {
        value: 'participant',
        label: 'Participants',
        active: true
      },
      {
        value: 'tutor',
        label: 'Tutors',
        active: true
      },
      {
        value: 'parent',
        label: 'Parents',
        active: true
      },
      {
        value: 'guest',
        label: 'Guests',
        active: true
      },
      {
        value: 'manager',
        label: 'Managers',
        active: true
      }
    ];

  var apiRoots = {
    dev: 'http://127.0.0.1:5000/api/',
    network: 'http://192.168.0.103:5000/api/',
    staging: 'https://dev.openpunchapp.com/api/',
    staging_http: 'http://dev.openpunchapp.com/api/',
    live: 'https://openpunchapp.com/api/',
    live_http: 'http://openpunchapp.com/api/'
  };

  // Workaround for Android devices that can't handle JSON.parse(null)
  // https://github.com/brianleroux/lawnchair/issues/48
  JSON.originalParse = JSON.parse;
  JSON.parse = function(text) {
    if (text) {
      return JSON.originalParse(text);
    }
  };

  // Hook into jquery
  // Use withCredentials to send the server cookies
  // The server must allow this through response headers
  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
    // Prepend api root to urls
    if (options.url[0] === '/') {
      options.url = apiRoots[env].replace('/api/', options.url);
    } else {
      options.url = apiRoots[env] + options.url;
    }
    // Add credentials to header
    options.xhrFields = {
      withCredentials: true
    };
    jqXHR.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  });

  /*
   * Base models and collections, depending on data source
   */

  var MongoModel = Backbone.Model.extend({
    idAttribute: '_id',
    parse: function(resp) {
      var field;
      // Convert JSONified BSON fields
      _.each(resp, function(v, k) {
        field = k.toLowerCase();
        // IDs
        if (_.string.endsWith(field, 'id') && _.isObject(v)) {
          resp[k] = v.$oid;
        }
        // Dates
        else if (_.string.startsWith(field, 'dt')) {
          resp[k] = new XDate(v.$date);
        }
      });
      return resp;
    }
  });

  // Salesforce
  var SFModel = Backbone.Model.extend({
    idAttribute: 'Id'
  });

  var OpenPunchModel = MongoModel.extend({
    isDeleted: function() {
      return this.get('_deleted') === true;
    }
  });

  var MongoCollection = Backbone.Collection.extend();

  var SFCollection = Backbone.Collection.extend({
    parse: function(response) {
      return response.records;
    }
  });

  var OpenPunchCollection = MongoCollection.extend({
    alive: function() {
      var models = this.reject(function(model) { return model.isDeleted(); });
      return new this.constructor(models);
    }
  });

  var BaseFormView = Backbone.View.extend({
    idPrefix: 'base-form-view-',
    submitButtonTemplate: _.template('<input type="submit" class="btn btn-large btn-block btn-primary" value="<%= label %>" />'),
    submitButtonLabel: 'Submit', // override this for each child view
    initialize: function() {
      _.bindAll(this, 'updateSuccess', 'updateError');
    },
    attributes: function() {
      return {
        id: this.idPrefix + ((this.model) ? this.model.id : this.cid),
        'class': this.idPrefix + 'page page hide'
      };
    },
    template: function() {
      return _.template($('#' + this.idPrefix + 'template').html());
    },
    events: {
      'click [type=submit]': 'commitForm'
    },
    appendSubmit:function () {
      this.$el.find('form').append(this.submitButtonTemplate({label:this.submitButtonLabel}));
    },
    render: function() {
      this.$el.html(this.template()(_.extend(this.model.toJSON(), self.helpers)));
      this.$el.find('.form-container').prepend(this.form.render().el);
      this.appendSubmit();
      return this;
    },
    commitForm: function(e) {
      e.preventDefault();
      var errors = this.form.commit();
      if (!errors) {
        this.model.save(this.form.model.toJSON(), {
          headers: self.account.reqHeaders(),
          success: this.updateSuccess,
          error: this.updateError
        });
      }
    },
    updateSuccess: function() {
      this.model.trigger('show:modal');
    },
    updateError: function() {
      console.error(arguments);
    }
  });


  /*
   * Rendering helper functions
   */

  self.helpers = {
    eventTime: function(d) {
      return new XDate(d, true).addHours(-5).toString('h:mmtt');
    },
    eventDate: function(dt) {
      var now = new XDate(true)
        , date = new XDate(dt, true)
        , y0 = now.getFullYear()
        , m0 = now.getMonth()
        , d0 = now.getDate()
        , y = date.getFullYear()
        , m = date.getMonth()
        , d = date.getDate()
        , delta = now.diffDays(date);
      if (delta < 2 && delta >= 0) {
        if (d===d0)
          return 'Today';
        else
          return 'Tomorrow';
      } else if (delta > -2 && delta <=0) {
        if (d===d0)
          return 'Today';
        else
          return 'Yesterday';
      } else {
        return date.addHours(-5).toString('ddd MMM d, yyyy');
      }
    },
    eventTitle: function(name) {
      return _.string.prune(name, 25);
    },
    relativeTime: function(d) {
      var date = new XDate(d, true)
        , now = new XDate(true)
        , hrsAgo = date.diffHours(now)
        , minAgo = date.diffMinutes(now)
        , secAgo = date.diffSeconds(now);
      if (hrsAgo > 12)
        return date.addHours(-5).toString('MMM d \'&middot\' h:mm tt');
      else if (hrsAgo > 1)
        return [Math.round(hrsAgo), (hrsAgo > 2) ? 'hours' : 'hour', 'ago'].join(' ');
      else if (minAgo > 1)
        return [Math.round(minAgo), (minAgo > 2) ? 'mins' : 'min', 'ago'].join(' ');
      else if (secAgo > 1)
        return [Math.round(secAgo), (secAgo > 2) ? 'secs' : 'sec', 'ago'].join(' ');
      else
        return 'just now';
    },
    datePickerFormats: {
      browser: {
        date: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('yyyy-MM-dd');
        },
        time: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('H:mm');
        },
        datetime: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('yyyy-MM-dd HH:mm');
        }
      },
      ios: {
        date: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('yyyy-MM-dd');
        },
        time: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('HH:mm');
        },
        datetime: function(dt) {
          return new XDate(dt, true).toISOString();
        }
      },
      android: {
        date: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('yyyy-MM-dd');
        },
        time: function(dt) {
          return new XDate(dt, true).addHours(-5).toString('HH:mm');
        },
        datetime: function(dt) {
          return new XDate(dt, true).toISOString();
        }
      }
    },
    totalHours: function(hrs) {
      var h = Math.floor(hrs)
        , m = Math.floor((hrs-h)*60);
      return _.string.sprintf("%s h %s m", h, m);
    },
    money: function(v) {
      var d = parseFloat(v);
      if (d>=0)
        return _.string.sprintf('$%.2f', d);
      else
        return _.string.sprintf('-$%.2f', Math.abs(d));
    },
    simpleDate: function(dt) {
      return new XDate(dt, true).addHours(-5).toString('MMM d');
    }
  };


  /*
  Filters for use in different list views
   */

  self.Filter = Backbone.Model.extend({
    idAttribute: 'value'
  });

  self.Filters = Backbone.Collection.extend({
    model: self.Filter,
    localStorage: new Backbone.LocalStorage("openpunch:filters")
  });

  self.FilterGroup = Backbone.Model.extend({
    activeValues: function() {
      return _.map(this.get('filters').where({active: true}), function(f) {
        return f.get('value');
      });
    },
    pass: function(model) {
      return _.indexOf(this.activeValues(), model.get(this.get('attr'))) !== -1;
    },
    isActive: function() {
      // Filter group is active if any filters are inactive
      return this.get('filters').any(function(f) {
        return f.get('active') === false;
      });
    }
  });

  self.FilterGroupRoles = self.FilterGroup.extend({
    defaults: {
      filters: new self.Filters(roles),
      attr: 'role'
    },
    initialize: function() {
      this.get('filters').each(this.syncFilter, this);
    },
    syncFilter: function(filter) {
      filter.fetch({
        error: function(model, resp) {
          if (resp === 'Record not found')
            model.save();
        }
      });
    }
  });

  self.FilterToggleView = Backbone.View.extend({
    tagName: 'button',
    attributes: function() {
      return {
        'data-toggle': 'button',
        'data-value': this.model.get('value'),
        'class': 'filter-button btn btn-block ' + (this.model.get('active') ? 'active btn-success' : '')
      };
    },
    events: {
      'click': 'toggleFilter'
    },
    initialize: function() {
      _.bindAll(this, 'toggleFilter');
      this.parent = this.options.parent;
    },
    render: function() {
      this.$el.text(this.model.get('label'));
      return this;
    },
    toggleFilter: function(e) {
      this.model.save('active', !this.model.get('active'));
      this.$el.toggleClass('btn-success', this.model.get('active'));
    }
  });

  /*
 Transaction
  */
  self.Transaction = OpenPunchModel.extend({
    defaults: function() {
      return {
        amount: 0,
        side: 'credit', // credit or debit
        type: 'Subscription Refill'
      };
    },
    ledgerAmount: function() {
      return this.get('amount') * ((this.get('side')==='credit') ? 1 : -1);
    },
    amountClass: function() {
      var b = this.ledgerAmount();
      if (b > 0)
        return 'plus';
      else if (b < 0)
        return 'minus';
      else
        return '';
    },
    pastTransactions: function() {
      return this.collection.alive().filter(function(t) {
        return new XDate(t.get('dt_add'), true) < new XDate(this.get('dt_add'), true) && t.get('contact_id')===this.get('contact_id');
      }, this);
    },
    newBalance: function() {
      return _.reduce(this.pastTransactions(), function(memo, t) {
        return memo + t.ledgerAmount();
      }, this.ledgerAmount());
    },
    event: function() {
      return (this.get('type')==='Event Fee' && this.get('event_id')) ? self.events.get(this.get('event_id')) : null;
    }
  });

  self.Transactions = OpenPunchCollection.extend({
    model: self.Transaction,
    url: 'transactions',
    comparator: function(model) {
      return -1 * new XDate(model.get('dt_add'), true).getTime();
    }
  });

  self.transactions = new self.Transactions();


  /*
   * Contact
   */

  self.Contact = OpenPunchModel.extend({
    defaults: {
      role: 'participant',
      manager_id: null
    },
    firstLast: function() {
      return this.get('first') + ' ' + this.get('last');
    },
    toString: function() {
      return this.firstLast();
    },
    firstLastInitial: function() {
      return this.get('first') + ' ' + this.get('last')[0] + '.';
    },
    attendees: function() {
      return new self.Attendees(self.attendees.where({contact_id: this.id})).alive();
    },
    actions: function() {
      var actions = this.attendees().map(function(a) {
        return a.actions();
      });
      var flattened = _.flatten(actions);
      return new self.Actions(flattened);
    },
    transactions: function() {
      return new self.Transactions(self.transactions.alive().where({contact_id: this.id}));
    },
    balance: function() {
      return this.transactions().reduce(function(memo, t) {
        return memo + t.ledgerAmount();
      }, 0.0);
    },
    balanceClass: function() {
      var b = this.balance();
      if (b > 0)
        return 'plus';
      else if (b < 0)
        return 'minus';
      else
        return '';
    },
    lowBalance: function() {
      return this.balance() < 10;
    },
    totalCheckIns: function() {
      return this.attendees().length;
    },
    totalTime: function() {
      // dtOut - dtIn, Hours
      var tt = this.attendees().reduce(function(memo, attendee) {
        return memo + attendee.hours();
      }, 0);
      return self.helpers.totalHours(tt);
    },
    manager: function() {
      var manager;
      var manager_id = this.get('manager_id');
      if (manager_id) {
        manager = self.contacts.alive().get(manager_id);
        if (manager) {
          return manager;
        }
      }
      return null;
    }
  });

  self.Contacts = OpenPunchCollection.extend({
    model: self.Contact,
    url: 'contacts',
    initialize: function() {
      _.bindAll(this, 'managers');
    },
    comparator: function(model) {
      return model.get('first').toLowerCase() + ' ' + model.get('last').toLowerCase();
    },
    managers: function() {
      var models = this.where({role: 'manager'});
      return new this.constructor(models);
    },
    facilitators: function() {
      var models = this.filter(function(model) {
        return _.indexOf(['tutor'], model.get('role')) > -1;
      });
      return new this.constructor(models);
    }
  });

  self.contacts = new self.Contacts();

  var getManagers = function(cb) {
    var nullManager = new self.Contact({id: null, first: '', last: ''});
    var managers = self.contacts.managers();
    managers.push(nullManager);
    return cb(managers);
  };

  var getFacilitators = function(cb) {
    var nullContact = new self.Contact({id: null, first: '', last: ''});
    var contacts = self.contacts.facilitators();
    contacts.push(nullContact);
    return cb(contacts);
  };


  /*
   * Event
   */

  self.Event = OpenPunchModel.extend({
    defaults: {
      cost: 5
    },
    attendees: function() {
      return new self.Attendees(self.attendees.where({event_id: this.id})).alive();
    },
    allActions: function() {
      var actions = this.attendees().map(function(a) {
        return a.actions();
      });
      var flattened = _.flatten(actions);
      return new self.Actions(flattened);
    },
    status: function() {
      var start = new XDate(this.get('dt_start'), true)
        , startEarly = start.addMinutes(-30)
        , end = new XDate(this.get('dt_end'), true)
        , endLate = end.addMinutes(30)
        , now = new XDate(true)
        , dStart = startEarly.diffMinutes(now)
        , dEnd = endLate.diffMinutes(now);
      if (dStart < 0 && dEnd < 0)
        return 'future';
      else if (dStart > 0 && dEnd > 0)
        return 'past';
      else
        return 'live';
    },
    totalAttendees: function() {
      return this.attendees().length;
    },
    lastAttendee: function() {
      var checkIns = this.attendees().sortBy(function(model) {
        return model.get('dt_in').getTime();
      });
      if (checkIns.length === 0)
        return null;
      var lastAttendee = _.last(checkIns);
      var contact = self.contacts.alive().get(lastAttendee.get('contact_id'));
      return contact;
    },
    facilitator: function() {
      var facilitator;
      var facilitator_id = this.get('facilitator_id');
      if (facilitator_id) {
        facilitator = self.contacts.alive().get(facilitator_id);
        if (facilitator) {
          return facilitator;
        }
      }
      return null;
    }
  });

  self.Events = OpenPunchCollection.extend({
    model: self.Event,
    url: 'events',
    comparator: function(event) {
      return -new XDate(event.get('dt_start'), true).getTime();
    }
  });

  self.events = new self.Events();


  /*
   * Attendee action
   */

  self.Action = OpenPunchModel.extend();

  self.Actions = OpenPunchCollection.extend({
    model: self.Action,
    url: 'actions',
    comparator: function(model) {
      return -1 * new XDate(model.get('dt'), true).getTime();
    }
  });


  /*
   * Attendee
   */

  self.Attendee = OpenPunchModel.extend({
    urlRoot: 'attendees',
    initialize: function() {
      _.bindAll(this
        , 'updateStatus'
        , 'chargeForEvent'
        , 'updateAttendeeTransaction'
      );
      this.on('sync', this.chargeForEvent, this);
    },

    /*
     * Convenience methods
     */
    contact: function() {
      return self.contacts.alive().get(this.get('contact_id'));
    },
    isCheckedIn: function() {
      return this.get('dt_in') && !this.get('dt_out');
    },
    isCheckedOut: function() {
      return this.get('dt_in') && this.get('dt_out');
    },
    actions: function() {
      var actions = [];
      if (this.get('dt_in')) {
        actions.push(new self.Action({
          event_id: this.get('event_id'),
          contact_id: this.get('contact_id'),
          dt: this.get('dt_in'),
          status: 'in'
        }));
        if (this.get('dt_out')) {
          actions.push(new self.Action({
            event_id: this.get('event_id'),
            contact_id: this.get('contact_id'),
            dt: this.get('dt_out'),
            status: 'out'
          }))
        }
      }
      return actions;
    },
    hours: function() {
      if (this.get('dt_in') && this.get('dt_out')) {
        return this.get('dt_in').diffHours(this.get('dt_out'));
      } else {
        return 0;
      }
    },

    /*
     * Toggle check in status
     */
    newDates: function() {
      if (this.isNew())
        return {dt_in: new XDate(true)};
      else if (this.isCheckedIn())
        return {dt_out: new XDate(true)};
      else
        return null;
    },
    updateStatus: function() {
      var newDates = this.newDates();
      if (newDates) {
        this.save(newDates, {
          wait: true,
          headers: self.account.reqHeaders(),
          error: this.updateStatusError
        });
      } else {
        alert('Attendee has already checked in and out and cannot be checked in again.');
      }
    },
    updateStatusError: function(err, resp) {
      console.error(err);
      alert('Could not update status');
    },

    /*
    Create transaction
     */
    transactions: function() {
      return self.transactions.alive().where({
        event_id: this.get('event_id'),
        contact_id: this.get('contact_id')
      });
    },
    chargeForEvent: function(model, coll) {
      // Only charge once per event
      if (this.transactions().length === 0) {
        self.transactions.create({
            event_id: this.get('event_id'),
            contact_id: this.get('contact_id'),
            type: 'Event Fee',
            amount: self.events.get(this.get('event_id')).get('cost'),
            side: 'debit'
          }, {
            wait: true,
            headers: self.account.reqHeaders(),
            success: this.updateAttendeeTransaction,
            error: this.chargeForEventError
        });
      }
    },
    updateAttendeeTransaction: function(model, resp) {
      this.save({transaction_id: model.id}, {headers: self.account.reqHeaders()});
      // Alert if balance below $10
      var contact = this.contact();
      if (contact.lowBalance()) {
        var msg = _.string.sprintf('%s has a low balance of %s', contact.firstLast(), self.helpers.money(contact.balance()));
        alert(msg);
      }
    },
    chargeForEventError: function(err, resp) {
      console.error(err);
    }

  });

  self.Attendees = OpenPunchCollection.extend({
    model: self.Attendee,
    url: 'attendees'
  });

  self.attendees = new self.Attendees();


  /*
   * Master account
   */

  self.Account = OpenPunchModel.extend({
    urlRoot: 'account',
    reqHeaders: function() {
      return {
        'X-OpenPunch-User-Id': this.get('user_id'),
        'X-OpenPunch-Account-Id': this.id,
        'X-OpenPunch-Session-Id': this.getSessionId()
      };
    },
    loadData: function() {
      var options = {
        headers: this.reqHeaders(),
        error: function(coll, resp) {
          console.error(resp.responseText);
          self.router.navigate('account/sign-out', {trigger: true});
        }
      };
      self.events.fetch(options);
      self.contacts.fetch(options);
      self.attendees.fetch(options);
      self.transactions.fetch(options);
    },
    setSessionId: function() {
      if (this.get('session_id'))
        localStorage.setItem(hashes.session_id, this.get('session_id'));
    },
    getSessionId: function() {
      return localStorage.getItem(hashes.session_id);
    },
    clearSessionId: function() {
      this.unset('session_id', {silent: true});
      localStorage.removeItem(hashes.session_id);
    }
  });

  self.account = new self.Account();

  /*
   * Sign In
   */

  self.SignInSchema = Backbone.Model.extend({
    schema: {
      email: {
        title: 'Email',
        validators: ['required', 'email'],
        fieldClass: 'signin-email',
        editorClass: 'span12',
        dataType: 'email'
      },
      password: {
        title: 'Password',
        type: 'Password',
        validators: ['required'],
        fieldClass: 'signin-password',
        editorClass: 'span12'
      }/*,
      saveEmail: {
        title: 'Remember me',
        type: 'Checkbox',
        template: 'checkbox'
      }*/
    }
  });

  self.SignInView = BaseFormView.extend({
    el: '#sign-in',
    idPrefix: 'signin-',
    submitButtonLabel: 'Sign In',
    initialize: function() {
      BaseFormView.prototype.initialize.call(this);
      _.bindAll(this, 'signInSuccess', 'signInError');
      this.form = new Backbone.Form({
        model: new self.SignInSchema(),
        idPrefix: 'signin-'
      });
    },
    render: function() {
      this.$el.find('.form-container').html(this.form.render().el);
      this.appendSubmit();
      return this;
    },
    commitForm: function(e) {
      e.preventDefault();
      this.$el.find('.form-error').addClass('hide');
      var errors = this.form.commit();
      if (!errors) {
        self.account.fetch({
          data: this.form.model.toJSON(),
          success: this.signInSuccess,
          error: this.signInError
        });
      }
    },
    signInSuccess: function(account) {
      // Remove focus from form
      $(':focus').blur();
      // Update local session ID
      account.setSessionId();
      // Redirect
      self.router.navigate('loading', {trigger: true});
    },
    signInError: function(account, resp) {
      console.error('sign in error: ' + JSON.stringify(resp));
      this.$el.find('.form-error').text(resp.responseText || 'Could not sign in').removeClass('hide');
    }
  });


  /*
   * Account
   */

  self.AccountView = Backbone.View.extend({
    el: '#account',
    template: _.template($('#account-view-template').html()),
    initialize: function() {
      _.bindAll(this, 'sync', 'syncSuccess', 'syncError');
      this.model = self.account;
    },
    events: {
      'click #sync': 'sync'
    },
    render: function() {
      var context = this.model.toJSON()
        , html = this.template(context)
        ;
      this.$el.find('#content-account').html(html);
      return this;
    },
    sync: function(e) {
      $.ajax({
        url: '/account/sf/connect/',
        dataType: 'json',
        type: 'post',
        cache: false,
        headers: self.account.reqHeaders(),
        success: this.syncSuccess,
        error: this.syncError
      });
      this.$el.find('#sync-wait').removeClass('hide');
      this.$el.find('#sync-report').addClass('hide');
    },
    syncSuccess: function(data) {
      function sum(d) {
        return _.reduce(d, function(memo, num) { return memo+num; }, 0);
      }
      var totalChanges = sum(_.map(data, function(d) {
        return sum(_.values(d));
      }));
      var html = '<strong>' + totalChanges + '</strong> total change(s) synced';
      this.$el.find('#sync-report').html(html).removeClass('hide');
      this.$el.find('#sync-wait').addClass('hide');
      // Reload data
      self.account.loadData();
    },
    syncError: function(jqXHR, textStatus, errorThrown) {
      console.error(jqXHR, textStatus, errorThrown);
      this.$el.find('#sync-wait').addClass('hide');
      alert('Oops! There was an error syncing the account.');
    }
  });


  /*
   * Loading
   */

  self.LoadingView = Backbone.View.extend({
    el: '#loading',
    initialize: function() {
      this.numLoaded = 0;
      this.numToLoad = 4;
      self.events.on('reset', this.dataFetched, this);
      self.contacts.on('reset', this.dataFetched, this);
      self.attendees.on('reset', this.dataFetched, this);
      self.transactions.on('reset', this.dataFetched, this);
    },
    dataReady: function() {
      return this.numLoaded === this.numToLoad;
    },
    dataFetched: function(coll) {
      // Collections is finished loaded, so incr the counter.
      this.numLoaded = this.numLoaded + 1;
      // If counter reaches target, go to the app
      if (this.dataReady()) {
        // Go to events
        self.router.navigate('events', {trigger: true});
      }
    }
  });


  /*
   * Events
   */

  self.EventsView = Backbone.View.extend({
    el: '#events',
    initialize: function() {
      _.bindAll(this, 'renderEvent');
      self.events.on('reset', this.renderEvents, this);
    },
    render: function() {
      this.list = this.$el.find('#events-list').empty();
      this.renderEvents(self.events);
      return this;
    },
    renderEvents: function(events, resp) {
      var eventGroups = events.alive().groupBy(function(event) {
        return self.helpers.eventDate(event.get('dt_start'));
      });
      _.each(eventGroups, _.bind(function(events, key, list) {
        this.list.append('<li class="section-title"><h6>' + key + '</h6></li>');
        _.each(events, this.renderEvent);
      }, this));
      // Placeholder if no events
      this.$el.find('.list-placeholder').toggleClass('hide', events.alive().length>0);
    },
    renderEvent: function(event) {
      var view = new self.EventLiView({model: event});
      this.list.append(view.render().el);
    },
    showDeleteAlert: function() {
      this.$el.find('.delete-alert').removeClass('hide');
      _.delay(_.bind(function() {
        this.$el.find('.delete-alert').addClass('hide');
      }, this), 3000);
    }
  });

  self.EventLiView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#event-li-view-template').html()),
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers)));
      return this;
    }
  });

  self.EventView = Backbone.View.extend({
    className: 'page event-page',
    attributes: function() {
      if (!this.model)
        self.router.navigate('loading', {trigger: true});
      return {
        id: 'event-' + this.model.id
      };
    },
    template: _.template($('#event-view-template').html()),
    events: {
      'click .init-scan': 'initScan'
    },
    initialize: function() {
      _.bindAll(this
        , 'initScan'
        , 'scanSuccess'
        , 'scanError'
      );
      self.attendees.on('add', this.refresh, this);
    },
    refresh: function(attendee) {
      if (attendee.get('event_id')===this.model.id)
        this.render();
    },
    render: function() {
      var lastAttendee = this.model.lastAttendee();
      var facilitator = this.model.facilitator();
      var context = this.model.toJSON();
      _.extend(context, self.helpers, {
        totalAttendees: this.model.totalAttendees(),
        lastAttendee: lastAttendee ? lastAttendee.toJSON() : null,
        status: this.model.status(),
        facilitator: facilitator ? facilitator.toJSON() : null
      });
      this.$el.html(this.template(context));
      return this;
    },

    /*
     * Scanning
     */
    initScan: function(event) {
      window.plugins = window.plugins || {};
      if (window.plugins.barcodeScanner) {
        window.plugins.barcodeScanner.scan(this.scanSuccess, this.scanError);
      } else {
        alert('Scanning from browser not supported');
      }
    },
    scanSuccess: function(result) {
      if (result.cancelled) {
        return false;
      } else {
        this.toggleStatus(result.text);
        return true;
      }
    },
    scanError: function(error) {
      alert("scanning failed: " + error);
    },

    /*
     * Attendee status
     */
    toggleStatus: function(contact_id) {
      var attendees = self.attendees.alive().where({contact_id: contact_id});
      if (attendees.length > 0) {
        // Attendee exists. Check out.
        var attendee = attendees[0];
        attendee.updateStatus();
      } else {
        // Check if contact exists
        var contact = self.contacts.alive().get(contact_id);
        if (contact) {
          self.attendees.create({
              contact_id: contact_id,
              event_id: this.model.id,
              dt_in: new XDate(true).toISOString()
            }, {
              wait: true,
              headers: self.account.reqHeaders(),
              error: function(model, resp) {
                console.error(resp);
                alert('Could not toggle status: ' + (resp.responseText || 'unknown error'));
              }
          });
        } else {
          alert('Contact with that ID does not exist');
        }
      }
    }

  }); // EventView

  self.EventSchema = Backbone.Model.extend({
    schema: {
      name: {
        title: 'Name',
        validators: ['required'],
        fieldClass: 'event-name',
        editorAttrs: {
          placeholder: 'e.g. Volunteer Club'
        },
        editorClass: 'span12'
      },
      dt_start: {
        title: 'Start Date &amp; Time',
        dataType: 'datetime',
        validators: ['required'],
        fieldClass: 'event-startdatetime',
        editorClass: 'span12'
      },
      dt_end: {
        title: 'End Date &amp; Time',
        dataType: 'datetime',
        validators: ['required'],
        fieldClass: 'event-enddatetime',
        editorClass: 'span12'
      },
      cost: {
        title: 'Cost',
        validators: ['required'],
        fieldClass: 'event-cost',
        editorClass: 'span3 currency',
        template: 'currency'
      },
      location: {
        title: 'Location',
        fieldClass: 'event-location',
        editorAttrs: {
          placeholder: 'e.g. Chicago Ave.'
        },
        help: '(optional)',
        editorClass: 'span12'
      },
      facilitator_id: {
        title: 'Facilitator',
        type: 'Select',
        fieldClass: 'event-facilitator',
        help: '(optional)',
        editorClass: 'span12',
        options: getFacilitators
      }
    }
  });

  self.EventSchemaDetail = Backbone.Model.extend({
    schema: {
      name: {
        title: 'Name',
        validators: ['required'],
        fieldClass: 'event-name',
        editorAttrs: {
          placeholder: 'e.g. Volunteer Club'
        },
        editorClass: 'span12'
      },
      dt_start: {
        title: 'Start Date',
        type: 'DateTime',
        validators: ['required'],
        fieldClass: 'event-startdatetime',
        editorClass: 'span12'
      },
      dt_end: {
        title: 'End Date',
        type: 'DateTime',
        validators: ['required'],
        fieldClass: 'event-enddatetime',
        editorClass: 'span12'
      },
      cost: {
        title: 'Cost',
        validators: ['required'],
        fieldClass: 'event-cost',
        template: 'currency',
        editorClass: 'span3 currency'
      },
      location: {
        title: 'Location',
        fieldClass: 'event-location',
        editorAttrs: {
          placeholder: 'e.g. Chicago Ave.'
        },
        help: '(optional)',
        editorClass: 'span12'
      },
      facilitator_id: {
        title: 'Facilitator',
        type: 'Select',
        fieldClass: 'event-facilitator',
        help: '(optional)',
        editorClass: 'span12',
        options: getFacilitators
      }
    }
  });

  self.FormSubmitModalView = Backbone.View.extend({
    idPrefix: '',
    attributes: function() {
      return {
        id: this.idPrefix + 'modal-' + this.model.id,
        'class': this.idPrefix + 'modal modal'
      };
    },
    template: function() {
      return _.template($('#' + this.idPrefix + 'modal-template').html());
    },
    events: {
      'click .dismiss': 'dismiss'
    },
    initialize: function() {
      _.bindAll(this, 'dismiss');
      this.model.on('show:modal', this.render, this);
    },
    render: function() {
      this.$el.html(this.template()({_id: this.model.id}));
      this.$el.modal({show: true});
      // Set position
      var modalTop = $(window).scrollTop() + $(window).height() - this.$el.height() - 20;
//        , modelW = $('body').width()-40;
      this.$el.offset({top: modalTop});
//      this.$el.width(modelW).offset({top: modalTop, left: 20});
      return this;
    },
    dismiss: function(e) {
      this.$el.modal('hide');
    }
  });

  self.EventEditSubmitModal = self.FormSubmitModalView.extend({
    idPrefix: 'event-edit-'
  });

  self.EventEditView = BaseFormView.extend({
    idPrefix: 'event-edit-',
    submitButtonLabel: 'Save Event',
    initialize: function() {
      BaseFormView.prototype.initialize.call(this);
      if (os==='ios') {
        this.form = new Backbone.Form({
          model: new self.EventSchema({
            _id: this.model.id,
            account_id: self.account.id,
            name: this.model.get('name'),
            dt_start: self.helpers.datePickerFormats[os].datetime(this.model.get('dt_start')),
            dt_end: self.helpers.datePickerFormats[os].datetime(this.model.get('dt_end')),
            cost: this.model.get('cost'),
            location: this.model.get('location'),
            facilitator_id: this.model.get('facilitator_id')
          }),
          idPrefix: 'event-'
        });
      } else {
        this.form = new Backbone.Form({
          model: new self.EventSchemaDetail({
            _id: this.model.id,
            account_id: self.account.id,
            name: this.model.get('name'),
            dt_start: new XDate(this.model.get('dt_start'), true).toDate(),
            dt_end: new XDate(this.model.get('dt_end'), true).toDate(),
            cost: this.model.get('cost'),
            location: this.model.get('location'),
            facilitator_id: this.model.get('facilitator_id')
          }),
          idPrefix: 'event-'
        });
      }
      this.modal = new self.EventEditSubmitModal({model: this.model});
    }
  });

  self.EventCreateView = BaseFormView.extend({
    idPrefix: 'event-create-',
    submitButtonLabel: 'Save New Event',
    initialize: function() {
      _.bindAll(this, 'eventCreateSuccess');
      this.model = new self.Event();
      this.form = new Backbone.Form({
        model: (os==='ios') ? new self.EventSchema(this.model.toJSON()) : new self.EventSchemaDetail(this.model.toJSON()),
        idPrefix: 'event-'
      });
    },
    commitForm: function(e) {
      e.preventDefault();
      var errors = this.form.commit();
      if (!errors) {
        self.events.create(this.form.model.toJSON(), {
          headers: self.account.reqHeaders(),
          success: this.eventCreateSuccess,
          error: this.eventCreateError
        });
      }
    },
    eventCreateSuccess: function(model) {
      // Reset model
      this.form.model.clear();
      this.form.model.set(self.Event.prototype.defaults);
      // Remove focus from form
      $(':focus').blur();
      // Go to new event's dashboard
      self.router.navigate('events/' + model.id, {trigger: true});
    },
    eventCreateError: function() {
      console.error(arguments);
    }
  });

  self.EventContactsView = Backbone.View.extend({
    className: 'page full event-contacts-page hide',
    attributes: function() {
      if (!this.model)
        self.router.navigate('loading', {trigger: true});
      return {
        id: 'event-contacts-' + this.model.id
      };
    },
    template: _.template($('#event-contacts-view-template').html()),
    initialize: function() {
      _.bindAll(this, 'renderEventContact');
    },
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers)));
      this.list = this.$el.find('.contact-list');
      self.contacts.alive().each(this.renderEventContact);
      return this;
    },
    renderEventContact: function(contact) {
      var attendees = self.attendees.alive().where({event_id: this.model.id, contact_id: contact.id})
        , attendee = (attendees.length>0) ? attendees[0] : new self.Attendee({
            contact_id: contact.id,
            event_id: this.model.id
          });
      var view = new self.EventContactLiView({
        model: contact,
        event: this.model,
        attendee: attendee
      });
      this.list.append(view.render().el);
    }
  });

  self.EventContactLiView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#event-contact-view-template').html()),
    events: {
      'click': 'toggleStatus'
    },
    initialize: function() {
      _.bindAll(this
        , 'statusIconClass'
        , 'lastSeenDate'
        , 'lastSeenLabelClass'
        , 'toggleStatus'
        , 'toggleStatusError'
      );
      this.event = this.options.event;
      this.attendee = this.options.attendee;
      this.attendee.on('change', this.render, this);
    },

    /*
     * Rendering
     */
    statusIconClass: function() {
      if (this.attendee.isCheckedIn())
        return 'icon-ok';
      else if (this.attendee.isCheckedOut())
        return 'icon-arrow-left';
      else
        return 'icon-blank';
    },
    lastSeenDate: function() {
     if (this.attendee.isNew()) {
        return null;
      } else {
        var t = this.attendee.isCheckedIn() ? 'dt_in' : 'dt_out';
        var dt = this.attendee.get(t);
        return self.helpers.relativeTime(dt);
      }
    },
    lastSeenLabelClass: function() {
      return this.attendee.isCheckedIn() ? 'label-success' : '';
    },
    helpers: function() {
      return {
        statusIconClass: this.statusIconClass,
        lastSeenDate: this.lastSeenDate,
        lastSeenLabelClass: this.lastSeenLabelClass
      };
    },
    render: function(action) {
      if (action)
        if (!(action.get('event_id')===this.event.id && action.get('contact_id')===this.model.id))
          return;
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers, this.helpers(), {
        attendee: this.attendee.toJSON()
      })));
      return this;
    },

    /*
     * Status
     */
    toggleStatus: function(e) {
      e.preventDefault();
      if (this.attendee.isNew()) {
        this.attendee.set('dt_in', new XDate(true));
        self.attendees.create(this.attendee, {
          wait: true,
          headers: self.account.reqHeaders(),
          error: this.toggleStatusError
        });
      } else {
        this.attendee.updateStatus();
      }
    },
    toggleStatusError: function(model, resp) {
      console.error(arguments);
      this.attendee.unset('dt_in');
      alert('Could not toggle status');
    }

  });

  self.EventHistoryView = Backbone.View.extend({
    className: 'page event-history-page hide',
    attributes: function() {
      if (!this.model)
        self.router.navigate('loading', {trigger: true});
      return {
        id: 'event-history-' + this.model.id
      };
    },
    template: _.template($('#event-history-view-template').html()),
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers)));
      this.list = this.$el.find('.action-list');
      this.model.allActions().each(this.renderEventAction, this);
      // Placeholder if no events
      this.$el.find('.list-placeholder').toggleClass('hide', this.model.allActions().length>0);
      return this;
    },
    renderEventAction: function(action) {
      var view = new self.EventActionLiView({model: action});
      this.list.append(view.render().el);
    }
  });

  self.EventActionLiView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#event-action-view-template').html()),
    initialize: function() {
      _.bindAll(this
        , 'timestamp'
        , 'timestampLabelClass'
      );
      this.model.set({contact: self.contacts.get(this.model.get('contact_id')).toJSON()});
    },

    /*
     * Rendering
     */
    timestamp: function() {
      return self.helpers.relativeTime(this.model.get('dt'));
    },
    timestampLabelClass: function() {
      return this.model.get('status')==='in' ? 'label-success' : 'label-important';
    },
    helpers: function() {
      return {
        timestamp: this.timestamp,
        timestampLabelClass: this.timestampLabelClass
      };
    },
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers, this.helpers())));
      return this;
    }

  });


  /*
   * Contacts
   */

  self.ContactsView = Backbone.View.extend({
    el: '#contacts',
    events: {
      'click #filter-contacts': 'toggleFilterDialog',
      'click .filter-button-close': 'closeFilters'
    },
    initialize: function() {
      _.bindAll(this, 'renderContact');
      self.contacts.on('reset', this.renderContacts, this);
      this.rolesFilter = new self.FilterGroupRoles();
      this.rolesFilter.get('filters').on('change:active', this.toggleFilterNotification, this);
    },
    render: function() {
      this.list = this.$el.find('.contact-list').empty();
      this.filterContainer = this.$el.find('.filter-container').empty();
      this.rolesFilter.get('filters').each(this.renderFilter, this);
      this.toggleFilterNotification();
      this.renderContacts(self.contacts);
      return this;
    },
    renderContacts: function(contacts, resp) {
      // Placeholder if no contacts
      this.$el.find('.list-placeholder').toggleClass('hide', contacts.alive().length>0);
      // Render each
      contacts.alive().each(this.renderContact);
    },
    renderContact: function(contact) {
      var view = new self.ContactLiView({
        model: contact,
        parent: this
      });
      this.list.append(view.render().el);
    },
    renderFilter: function(filter) {
      var view = new self.FilterToggleView({
        model: filter,
        parent: this
      });
      this.filterContainer.append(view.render().el);
    },
    showDeleteAlert: function() {
      this.$el.find('.delete-alert').removeClass('hide');
      _.delay(_.bind(function() {
        this.$el.find('.delete-alert').addClass('hide');
      }, this), 3000);
    },
    toggleFilterDialog: function(e) {
      e.preventDefault();
      $(e.currentTarget).parent().toggleClass('open');
    },
    closeFilters: function(e) {
      $(e.currentTarget).parents('.open').removeClass('open');
    },
    toggleFilterNotification: function() {
      this.$el.find('#filter-contacts').toggleClass('btn-warning', this.rolesFilter.isActive());
    }
  });

  self.ContactLiView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#contact-li-view-template').html()),
    initialize: function() {
      this.options.parent.rolesFilter.get('filters').on('change:active', this.updateFilter, this);
    },
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers)));
      this.updateFilter();
      return this;
    },
    updateFilter: function() {
      this.$el.toggleClass('hide', !this.options.parent.rolesFilter.pass(this.model));
    }
  });

  self.ContactView = Backbone.View.extend({
    className: 'page contact-page',
    template: _.template($('#contact-view-template').html()),
    attributes: function() {
      return {
        id: 'contact-' + this.model.id
      };
    },
    helpers: function() {
      return {
        firstLast: _.bind(this.model.firstLast, this.model),
        firstLastInitial: _.bind(this.model.firstLastInitial, this.model),
        totalCheckIns: _.bind(this.model.totalCheckIns, this.model),
        totalTime: _.bind(this.model.totalTime, this.model),
        balance: _.bind(this.model.balance, this.model),
        balanceClass: _.bind(this.model.balanceClass, this.model)
      };
    },
    render: function() {
      var manager = this.model.manager();
      var context = this.model.toJSON();
      _.extend(context, self.helpers, this.helpers());
      context.manager = manager ? manager.toJSON() : null;
      this.$el.html(this.template(context));
      return this;
    }
  });

  self.ContactSchema = Backbone.Model.extend({
    schema: {
      first: {
        title: 'First name',
        validators: ['required'],
        fieldClass: 'contact-first',
        editorAttrs: {
          placeholder: 'e.g. Jane'
        },
        editorClass: 'span12'
      },
      last: {
        title: 'Last name',
        validators: ['required'],
        fieldClass: 'contact-last',
        editorAttrs: {
          placeholder: 'e.g. Smith'
        },
        editorClass: 'span12'
      },
      role: {
        title: 'Role',
        type: 'Select',
        options: _.pluck(roles, 'value'),
        validators: ['required'],
        fieldClass: 'contact-role',
        editorClass: 'span12'
      },
      manager_id: {
        title: 'Account Manager',
        type: 'Select',
        options: getManagers,
        fieldClass: 'contact-manager',
        editorClass: 'span12'
      }
    }
  });

  self.EditContactSubmitModal = self.FormSubmitModalView.extend({
    idPrefix: 'contact-edit-'
  });

  self.EditContactView = BaseFormView.extend({
    idPrefix: 'contact-edit-',
    submitButtonLabel: 'Save Contact',
    initialize: function() {
      BaseFormView.prototype.initialize.call(this);
      this.form = new Backbone.Form({
        model: new self.ContactSchema(this.model.toJSON()),
        idPrefix: 'contact-'
      });
      this.modal = new self.EditContactSubmitModal({model: this.model});
    }
  });

  self.ContactCreateView = BaseFormView.extend({
    idPrefix: 'contact-create-',
    submitButtonLabel: 'Save New Contact',
    initialize: function() {
      _.bindAll(this, 'contactCreateSuccess');
      this.model = new self.Contact();
      this.form = new Backbone.Form({
        model: new self.ContactSchema(),
        idPrefix: 'contact-'
      });
    },
    commitForm: function(e) {
      e.preventDefault();
      var errors = this.form.commit();
      if (!errors) {
        self.contacts.create(this.form.model.toJSON(), {
          headers: self.account.reqHeaders(),
          success: this.contactCreateSuccess,
          error: this.contactCreateError
        });
      }
    },
    contactCreateSuccess: function(model) {
      // Remove focus from form
      $(':focus').blur();
      self.router.navigate('contacts/' + model.id, {trigger: true});
    },
    contactCreateError: function() {
      console.error(arguments);
    }
  });

  var isNumber = function(field, value, formValues) {
    var err = {
      type: field,
      message: 'must be a number'
    };
    if (_.isNaN(parseFloat(value)))
      return err;
  };

  var gt0 = function(field, value, formValues) {
    var err = {
      type: field,
      message: 'must be more than $0'
    };
    if (parseFloat(value) <= 0)
      return err;
  };

  self.TransactionSchema = Backbone.Model.extend({
    schema: {
      type: {
        title: 'Transaction Type',
        type: 'Select',
        options: ['Subscription Refill', 'Adhoc Charge'],
        validators: ['required'],
        fieldClass: 'transaction-type',
        editorClass: 'span12'
      },
      amount: {
        title: 'Amount',
        validators: [
          'required',
          _.bind(isNumber, this, 'amount'),
          _.bind(gt0, this, 'amount')
        ],
        fieldClass: 'transaction-amount',
        editorClass: 'span3 currency',
        template: 'currency'
      },
      notes: {
        title: 'Notes',
        type: 'TextArea',
        help: '(optional)',
        fieldClass: 'transaction-notes',
        editorClass: 'span12'
      }
    }
  });

  self.TransactionCreateView = BaseFormView.extend({
    idPrefix: 'transaction-create-',
    submitButtonLabel: 'Create Transaction',
    initialize: function() {
      _.bindAll(this, 'transactionCreateSuccess', 'transactionCreateError', 'changeSide');
      this.model = new self.Transaction({contact_id: this.model.id});
      this.form = new Backbone.Form({
        model: new self.TransactionSchema({
          amount: 0
        }),
        idPrefix: 'transaction-'
      });
      this.form.on('type:change', this.changeSide);
    },
    changeSide: function(form, titleEditor) {
      // Update ledger side
      this.model.set({side: (titleEditor.getValue()==='Adhoc Charge') ? 'debit' : 'credit'}, {silent: true});
    },
    commitForm: function(e) {
      e.preventDefault();
      var errors = this.form.commit();
      if (!errors) {
        self.transactions.create(
          _.extend(
            this.options,
            this.model.toJSON(),
            this.form.model.toJSON()
          ),
          {
            wait: true,
            headers: self.account.reqHeaders(),
            success: this.transactionCreateSuccess,
            error: this.transactionCreateError
          }
        );
      }
    },
    transactionCreateSuccess: function(model) {
      // Reset model
      this.form.model.clear();
      // Remove focus from form
      $(':focus').blur();
      // Go to new contact transactions list
      self.router.navigate('contacts/' + model.get('contact_id') + '/transactions', {trigger: true});
      // Show alert
      self.router.renderedViews.ContactTransactionsView[model.get('contact_id')].showAddAlert();
    },
    transactionCreateError: function(model, resp) {
      console.error(resp.responseText);
      self.transactions.remove(self.transactions.getByCid(model.cid));
    }
  });

  self.ContactTransactionsView = Backbone.View.extend({
    className: 'page contact-transactions-page hide',
    attributes: function() {
      if (!this.model)
        self.router.navigate('loading', {trigger: true});
      return {
        id: 'contact-transactions-' + this.model.id
      };
    },
    template: _.template($('#contact-transactions-view-template').html()),
    initialize: function() {
      _.bindAll(this, 'renderContactTransaction');
    },
    helpers: function() {
      return {
        firstLastInitial: _.bind(this.model.firstLastInitial, this.model)
      };
    },
    render: function() {
      this.$el.html(this.template(_.extend(
        this.model.toJSON(),
        self.helpers,
        this.helpers())
      ));
      this.list = this.$el.find('.transaction-list');
      this.model.transactions().each(this.renderContactTransaction);
      // Placeholder if no transactions
      var hasTransactions = this.model.transactions().length>0;
      this.$el.find('.list-placeholder').toggleClass('hide', hasTransactions);
      this.$el.find('.transaction-list').toggleClass('hide', !hasTransactions);
      return this;
    },
    renderContactTransaction: function(action) {
      var view = new self.ContactTransactionTrView({model: action});
      this.list.append(view.render().el);
    },
    showAddAlert: function() {
      this.$el.find('.add-alert').removeClass('hide');
      _.delay(_.bind(function() {
        this.$el.find('.add-alert').addClass('hide');
      }, this), 3000);
    }
  });

  self.ContactTransactionTrView = Backbone.View.extend({
    tagName: 'tr',
    template: _.template($('#contact-transaction-tr-view-template').html()),

    /*
     * Rendering
     */
    helpers: function() {
      var event = this.model.event();
      return {
        event: event ? event.toJSON() : null,
        ledgerAmount: _.bind(this.model.ledgerAmount, this.model),
        amountClass: _.bind(this.model.amountClass, this.model),
        newBalance: _.bind(this.model.newBalance, this.model)
      };
    },
    render: function() {
      this.$el.html(this.template(_.extend(
        this.model.toJSON(),
        self.helpers,
        this.helpers())
      ));
      return this;
    }
  });

  self.ContactHistoryView = Backbone.View.extend({
    className: 'page contact-history-page hide',
    attributes: function() {
      if (!this.model)
        self.router.navigate('loading', {trigger: true});
      return {
        id: 'contact-history-' + this.model.id
      };
    },
    template: _.template($('#contact-history-view-template').html()),
    initialize: function() {
      _.bindAll(this, 'renderContactAction');
    },
    helpers: function() {
      return {
        firstLastInitial: _.bind(this.model.firstLastInitial, this.model)
      };
    },
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers, this.helpers())));
      this.list = this.$el.find('.action-list');
      this.model.actions().each(this.renderContactAction);
      // Placeholder if no actions
      this.$el.find('.list-placeholder').toggleClass('hide', this.model.actions().length>0);
      return this;
    },
    renderContactAction: function(action) {
      var view = new self.ContactActionLiView({model: action});
      this.list.append(view.render().el);
    }
  });

  self.ContactActionLiView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#contact-action-view-template').html()),
    initialize: function() {
      _.bindAll(this, 'timestamp');
      var event = self.events.get(this.model.get('event_id'));
      if (event)
        this.model.set({event: event.toJSON()});
      else
        this.template = true;
    },

    /*
     * Rendering
     */
    timestamp: function() {
      return self.helpers.relativeTime(this.model.get('dt'));
    },
    statusVerb: function() {
      return (this.status==='in') ? 'into' : 'out of';
    },
    helpers: function() {
      return {
        timestamp: this.timestamp,
        statusVerb: this.statusVerb
      };
    },
    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), self.helpers, this.helpers())));
      return this;
    }

  });


  /*
   * Errors
   */

  self.Error404 = Backbone.View.extend({
    el: '#error-404'
  });


  /*
   * Application controller
   */

  self.Workspace = Backbone.Router.extend({
    route: function(route, name, callback) {
      return Backbone.Router.prototype.route.call(this, route, name, function() {
        if (name !== 'signIn' && !(self.account.has('session_id') || self.account.id)) {
          this.signIn();
          return false;
        } else {
          callback.apply(this, arguments);
        }
      });
    },

    /*
     * Render group of pages once
     */
    renderedViews: {
      SignInView: {},
      AccountView: {},
      LoadingView: {},
      EventsView: {},
      EventCreateView: {},
      EventView: {},
      EventEditView: {},
      EventHistoryView: {},
      EventContactsView: {},
      ContactsView: {},
      ContactCreateView: {},
      ContactView: {},
      EditContactView: {},
      TransactionCreateView: {},
      ContactTransactionsView: {},
      ContactHistoryView: {},
      Error404: {}
    },
    pageIsLoaded: function(viewClass, id) {
      id = id || 0;
      return _.has(this.renderedViews[viewClass], id);
    },
    renderView: function(id, options, constr) {
      if (!this.pageIsLoaded(constr, id)) {
        // Render event
        var view = new self[constr](options);
        // Append to body
        $('body').append(view.render().el);
        // Save view for later
        this.renderedViews[constr][id] = view;
      }
    },
    renderViews: function(id, toRender, options) {
      options = options || {};
      _.each(toRender, _.bind(function(constr) {
        // Render event
        var view = new self[constr](options);
        // Append to body
        $('body').append(view.render().el);
        // Save view for later
        this.renderedViews[constr][id] = view;
      }, this));
    },
    loadExistingPage: function(id, viewClass) {
      // Hide all pages
      $('.page').addClass('hide');
      // Hide all menus left open
      $('.leave-open').removeClass('open');
      // Show page
      this.renderedViews[viewClass][id].render().$el.removeClass('hide');
    },
    loadPage: function(options) {
      options = options || {};
      var viewConstructors = _.flatten([options.views])
        , viewId = options.id || 0
        , viewOptions = options.options || {};
      // Render views, if necessary
      _.each(viewConstructors, _.bind(this.renderView, this, viewId, viewOptions));
      // Load view
      this.loadExistingPage(viewId, viewConstructors[0]);
      // Make sure we start from the top
      window.scrollTo(0, 0);
    },


    /*
     * Routing
     */
    routes: {
      ''                      : 'signIn',
      'loading'               : 'loading',
      'account'               : 'account',
      'account/sign-in'       : 'signIn',
      'account/sign-out'      : 'signOut',
      'events'                : 'events',
      'events/new'            : 'eventNew',
      'events/:id'            : 'eventDashboard',
      'events/:id/dashboard'  : 'eventDashboard',
      'events/:id/edit'       : 'eventEdit',
      'events/:id/delete'     : 'eventDelete',
      'events/:id/history'    : 'eventHistory',
      'events/:id/contacts'   : 'eventContacts',
      'contacts'              : 'contacts',
      'contacts/new'          : 'contactNew',
      'contacts/:id'          : 'contactDetails',
      'contacts/:id/details'  : 'contactDetails',
      'contacts/:id/edit'     : 'contactEdit',
      'contacts/:id/delete'   : 'contactDelete',
      'contacts/:id/transactions': 'contactTransactions',
      'contacts/:id/transactions/new': 'transactionNew',
      'contacts/:id/history'  : 'contactHistory',
      '404'                   : 'error404'
    },

    /*
     * Account
     */
    signIn: function() {
      if (self.account.has('session_id')) {
        // Account signed in, move along...
        self.router.navigate('loading', {trigger: true});
      } else {
        // See if locally stored session ID is still valid
        var localSessionId = self.account.getSessionId();
        if (localSessionId) {
          // Session cookie set, need to retrieve account then move along...
          self.account.fetch({
            headers: self.account.reqHeaders(),
            success: function(model, resp) {
              // Set session ID
              self.account.setSessionId();
              // Load data
              self.router.navigate('loading', {trigger: true});
            },
            error: function(model, resp) {
              // Remove stale session ID
              self.account.clearSessionId();
              // Try sign in page again
              self.router.navigate('account/sign-in', {trigger: true});
            }
          });
        } else {
          // Make user sign in
          this.loadPage({views: 'SignInView'});
        }
      }
    },

    signOut: function() {
      // Clear all data
      self.account.clear({silent: true});
      self.events.reset([], {silent: true});
      self.contacts.reset([], {silent: true});
      self.attendees.reset([], {silent: true});
      self.transactions.reset([], {silent: true});
      // Reset load count
      if (this.pageIsLoaded('LoadingView')) {
        this.renderedViews.LoadingView[0].numLoaded = 0;
      }
      // Remove stale session ID
      self.account.clearSessionId();
      // Go to sign in
      self.router.navigate('account/sign-in', {trigger: true});
    },

    account: function() {
      this.loadPage({views: 'AccountView'});
    },

    /*
     * Loading
     */
    loading: function() {
      if (this.pageIsLoaded('LoadingView')) {
        // View exists, so check if data needs to be reloaded
        var view = this.renderedViews.LoadingView[0];
        if (view.dataReady()) {
          // Ready to go
          self.router.navigate('events', {trigger: true});
        } else {
          // Show page, reload data
          this.loadPage({views: 'LoadingView'});
          self.account.loadData();
        }
      } else {
        // Need to render view and load data
        this.loadPage({views: 'LoadingView'});
        self.account.loadData();
      }
    },

    /*
     * Events
     */
    events: function() {
      this.loadPage({views: 'EventsView'});
    },
    eventNew: function() {
      this.loadPage({views: 'EventCreateView'});
    },
    eventDashboard: function(id) {
      var event = self.events.get(id);
      if (!event) {
        self.router.navigate('404', {trigger: true});
      } else {
        this.loadPage({
          id: id,
          views: ['EventView', 'EventHistoryView', 'EventContactsView', 'EventEditView'],
          options: {model: event}
        });
      }
    },
    eventEdit: function(id) {
      this.loadPage({id: id, views: 'EventEditView'});
    },
    eventDelete: function(id) {
      var event = self.events.get(id);
      if (confirm('Delete "' + event.get('name') + '"? This will also remove the event from each attendee\'s history.')) {
        event.destroy({
          headers: self.account.reqHeaders(),
          success: _.bind(function() {
            this.renderedViews.EventsView[0].showDeleteAlert();
            self.router.navigate('events', {trigger: true});
          }, this),
          error: function(model, resp) {
            console.error('Could not delete event:', event.get('name'), resp);
            alert('Oops! Could not delete event.');
          }
        });
      }
    },
    eventHistory: function(id) {
      this.loadPage({id: id, views: 'EventHistoryView'});
    },
    eventContacts: function(id) {
      this.loadPage({id: id, views: 'EventContactsView'});
    },

    /*
     * Contacts
     */
    contacts: function() {
      this.loadPage({views: 'ContactsView'});
    },
    contactNew: function() {
      this.loadPage({views: 'ContactCreateView'});
    },
    contactDetails: function(id) {
      var model = self.contacts.get(id);
      if (!model) {
        self.router.navigate('404', {trigger: true});
      } else {
        this.loadPage({
          id: id,
          views: ['ContactView', 'ContactTransactionsView', 'ContactHistoryView', 'EditContactView', 'TransactionCreateView'],
          options: {model: model}
        });
      }
    },
    contactEdit: function(id) {
      this.loadPage({id: id, views: 'EditContactView'});
    },
    contactDelete: function(id) {
      var contact = self.contacts.get(id);
      if (confirm('Delete "' + contact.firstLast() + '"? This will also remove contact from each event\'s history.')) {
        contact.destroy({
          headers: self.account.reqHeaders(),
          success: _.bind(function() {
            this.renderedViews.ContactsView[0].showDeleteAlert();
            self.router.navigate('contacts', {trigger: true});
          }, this),
          error: function(model, resp) {
            console.error('Could not delete contact:', contact.firstLast(), resp);
            alert('Oops! Could not delete contact.');
          }
        });
      }
    },
    transactionNew: function(contact_id) {
      this.loadPage({id: contact_id, views: 'TransactionCreateView'});
    },
    contactTransactions: function(id) {
      this.loadPage({id: id, views: 'ContactTransactionsView'});
    },
    contactHistory: function(id) {
      this.loadPage({id: id, views: 'ContactHistoryView'});
    },

    /*
    Errors
     */
    error404: function() {
      this.loadPage({views: 'Error404'});
    }

  });

  self.router = new self.Workspace();

  // Check account for all routes
  self.router.on('route', function() {
    if (!self.account.has('session_id') || !self.account.id) {
      self.router.navigate('account/sign-in', {trigger: true});
      return false;
    }
  });

  Backbone.history.start();

}