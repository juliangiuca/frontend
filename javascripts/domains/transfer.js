with (Hasher('Transfer','Application')) {

  define('show', function() {
		show_get_domain_form_modal();
  });

	define('check_auth_code', function(name, info, form_data) {
		start_modal_spin('Processing...')

		Badger.getDomainInfo(form_data, function(response) {
			if (response.data.code == 2202 || response.meta.status != 'ok') {
				show_domain_locked_help_modal(name, info, error_message(response));
			} else {
				BadgerCache.getAccountInfo(function(account_info) {
		      // ensure they have at least one domain_credit
		      if (account_info.data.domain_credits <= 0) {
						Billing.purchase_modal(curry(check_auth_code, name, info, form_data));
		      } else {
        		start_modal_spin('Processing, please wait...')

            BadgerCache.getContacts(function(contacts) {
              if (contacts.data.length == 0) {
                Whois.edit_whois_modal(null, curry(check_auth_code, name, info, form_data));
              } else {
                import_dns_settings(name, info, form_data);
              }
            });
		      }
		    });
			}
		});		
	});

  define('import_dns_settings', function(name, info, form_data) {
    start_modal_spin('Reading your current DNS settings, please wait...');

    Badger.remoteDNS(name, function(response) {
      show_dns_settings_modal(name, info, form_data, response.data);
    });
  });

  define('select_whois_and_dns_settings', function(name, info, first_form_data, records, import_setting_form) {
    show_select_whois_and_dns_settings_modal(name, info, first_form_data, records, import_setting_form);
  });

	define('get_domain_info', function(form_data) {
		start_modal_spin('Loading domain info...')
		$('#get-domain-form-errors').empty();
		
		// make sure it's a valid domain name before making api call
		form_data.name = form_data.name.toLowerCase();
		Badger.getDomainInfo(form_data, function(response) {
		  console.log(response)
			if (response.data.code == 2303)//the domain object does not exist, render the proper error message
				show_get_domain_form_modal(form_data, error_message({ data: { message: "Domain not found" } }));
			else if(response.data.code != 1000)
				show_get_domain_form_modal(form_data, error_message({ data: { message: "Internal server error" } }));
			else if(response.data.pending_transfer)
				show_get_domain_form_modal(form_data, error_message({ data: { message: "Domain already pending transfer" } }));
			else {
				if(response.data.locked) {
					show_domain_locked_help_modal(form_data.name, response.data);
				} else {
          if (response.data.registrar.name.toLowerCase().indexOf('godaddy') != -1)
            Badger.remoteWhois(form_data.name, function(whois_response) {
              if (whois_response.data.privacy) {
                show_domain_locked_help_modal(form_data.name, response.data);
              } else
                show_get_auth_code_modal(form_data.name, response.data);
            });
          else
            show_domain_locked_help_modal(form_data.name, response.data);
				}
			}
		});
	});
	
	define('transfer_domain', function(name, info, first_form_data, records, import_setting_form, form_data) {
		start_modal_spin('Registering domain(s)...')

		Badger.registerDomain(form_data, function(response) {
			if (response.meta.status == 'created') {
				update_credits(true);
				BadgerCache.flush('domains');

        if (info.registrar.name.toLowerCase().indexOf('godaddy') != -1) {
          godaddy_transfer_confirm(info.registrar.name);
        } else {
          transfer_confirm(info.registrar.name);
        }

        if (import_setting_form.import_dns_settings_checkbox) {
          $.each(records, function() {
            var record = { 'record_type': this.record_type, 'content': this.value, 'ttl': 1800, 'priority': this.priority, 'subdomain': this.subdomain };
            Badger.addRecord(name, record);
          });
        }
        
			} else {
				show_domain_locked_help_modal(name, info, error_message(response));
			}
		});
		
	});

	define('transfer_complete', function() {
    hide_modal();
    set_route('#filter_domains/transfers/list');
  });


};

with (Hasher('Transfer','Application')) {
		
	define('show_domain_locked_help_modal', function(name, info) {
		show_modal(
		  div(
  			h1({ 'class': 'long-domain-name'}, 'TRANSFER IN ' + name),
  			div({ 'class': 'error-message' },
        div("You need to " + ( info.locked ? "unlock" : "disable privacy of") + " this domain through " + (info.registrar.name.indexOf('Unknown') == 0 ? 'the current registrar' : info.registrar.name)) ),
  			table(
          tbody(
            tr(
              td( strong("Current Registrar:") ),
              td(info.registrar.name)
            ),
            tr(
              td( strong("Created:") ),
              td(new Date(Date.parse(info.created_at)).toDateString())
            ),
            tr(
              td( strong("Expiration:") ),
              td(new Date(Date.parse(info.expires_on)).toDateString())
            ),
            info.locked ?
            tr(
              td( strong("Locked:") ),
              td('Yes')
            )
            :
            tr(
              td( strong("Privacy:") ),
              td('Enabled')
            )
          )
  			),
  			//unlock_instructions_for_registrar(, info.registrar.name),
  			a({ 'class': 'myButton myButton-small', style: 'float: right', href: curry(get_domain_info, { name: name }) }, "Retry"),
  			br()
  		)
		);
	});
	
	define('show_get_auth_code_modal', function(name, info, error) {
		show_modal(
  		form({ action: curry(check_auth_code, name, info) },
  			h1('Auth Code'),

  			div({ id: "get-auth-code-errors" }, error),
  			div("Please obtain the auth code from ", strong(info.registrar ? info.registrar.name : 'Unknown'), " and enter it below."),
  			div({ style: 'text-align: center; margin: 30px 0'}, 
  				input({ name: 'auth_code', 'class': 'fancy', placeholder: 'Auth Code' }),
  				input({ name: 'name', type: 'hidden', value: name }),
  				input({ 'class': 'myButton', type: 'submit', value: 'Next' })
  			)

  			//get_auth_code_instructions_for_registrar(info.registrar.name),
			)
		);
	});
	
	define('show_select_whois_and_dns_settings_modal', function(name, info, first_form_data, records, import_setting_form) {
		show_modal(
		  form({ action: curry(transfer_domain, name, info, first_form_data, records, import_setting_form) },
  			h1({ 'class': 'long-domain-name'}, 'TRANSFER IN ' + name),
			
  			input({ type: 'hidden', name: 'name', value: name }),
  			input({ type: 'hidden', name: 'auth_code', value: first_form_data.auth_code }),
        input({ type: 'hidden', name: 'auto_renew', value: 'true'}),
        input({ type: 'hidden', name: 'privacy', value: 'true'}),
        input({ type: 'hidden', name: 'name_servers', value: (import_setting_form.import_dns_settings_checkbox ? 'ns1.badger.com,ns2.badger.com' : (info.name_servers || []).join(',')) }),

  			table({ style: 'width:100%' }, tbody(
          tr(
            td({ style: "width: 50%; vertical-align: top" },

              h3({ style: 'margin-bottom: 3px'}, 'Registrant:'),
              select({ name: 'registrant_contact_id', style: 'width: 150px' },
                WhoisApp.profile_options_for_select()
              )
            ),
            td({ style: "width: 50%; vertical-align: top" },
  						h3({ style: 'margin-bottom: 3px' }, "Length"),
  						'1 additional year @ 1 credit per year'
            )
          )
        )),

  			div({ style: "text-align: center; margin-top: 10px" }, input({ 'class': 'myButton', type: 'submit', value: 'Transfer ' + Domains.truncate_domain_name(name) + ' for 1 Credit' }))
  		)
		);
	})
	
	define('show_get_domain_form_modal', function(data, error) {
		show_modal(
		  div(
  			h1("TRANSFER IN A DOMAIN"),
        form({ id: "get-domain-info-form", action: curry(Signup.require_user_modal, get_domain_info) },
  			  div({ id: "get-domain-form-errors" }, error ? error : null),
  				div("Use this form if you've registered a domain at another registrar and would like to transfer the domain to Badger.  If you have lots of domains to transfer, you can use our ", a({ href: BulkTransfer.show }, 'Bulk Transfer Tool'), '.'),
  				div({ style: 'text-align: center; margin: 30px 0'},
    				input({ name: "name", 'class': 'fancy', placeholder: "example.com", value: data && data.name || '' }),
    				input({ 'class': 'myButton', type: "submit", value: "Next"})
          )
  			)
  		)
  	);
	});
	
	// implement different instructions for certain registrars at some point
  // define('unlock_instructions_for_registrar', function(registrar) {
  //  return div("You need to unlock this domain through " + (registrar.indexOf('Unknown') == 0 ? 'the current registrar' : registrar) + '.');
  // });
	
	//todo add more help
  // define('get_auth_code_instructions_for_registrar', function(registrar) {
  //  return div("Please refer to the currently owning registrar for instructions on how to find the authorization code.");
  // });
	
  define('transfer_confirm', function(registrar_name) {
    show_modal(
      h1('Transfer Request Submitted'),
      div("We have submitted your transfer request and will email you when it is complete."),
      ul(
        li("If you do nothing, this request will be ", strong("automatically appoved in 5 days.")),
        li("You may be able to manually approve the domain transfer through ", registrar_name),
        li(registrar_name, " may email you with instructions on how to approve the domain transfer sooner.")
      ),
      
			div({ style: 'text-align: right; margin-top: 10px'}, 
			  a({ href: transfer_complete, 'class': 'myButton', value: "submit" }, "Close")
			)
    );
  });

  define('godaddy_transfer_confirm', function() {
    show_modal(
      h1('Transfer Request Submitted'),
      div("This request will be ", strong("automatically approved in 5 days"), ".  If you'd like to manually approve this domain transfer, visit ", a({ href: "https://dcc.godaddy.com/default.aspx?activeview=transfer&filtertype=3&sa=#", target: "_blank" }, "GoDaddy's Pending Transfers"), ' page.'),
      
			div({ style: 'text-align: right; margin-top: 10px'}, 
			  a({ href: transfer_complete, 'class': 'myButton', value: "submit" }, "Close")
			)
    );
  });

  define('show_dns_settings_modal', function( name, info, first_form_data, records) {
    var results = records.map(function(record) {
      return tr(
        td(record.subdomain),
        td(record.record_type),
        td(record.priority ? record.priority + ' ' : '',  record.value)
      )
    });
    show_modal(
      div(
        h1('Import DNS into Badger?'),
        div({ 'class': 'y-scrollbar-div' },
          table({ 'class': 'fancy-table', id: 'dns-settings' },
            tbody(
              tr(
                th('Host'),
                th('Type'),
                th('Destination')
              ),
              results
            )
          )
        ),
        form({ action: curry(select_whois_and_dns_settings, name, info, first_form_data, records) },
          div({ style: 'padding: 15px 0' }, 
            input({ type: 'checkbox', name: 'import_dns_settings_checkbox', value: 'ns1.badger.com,ns2.badger.com', checked: 'checked', id: 'import_dns_settings_checkbox' }),
            label({ 'for': 'import_dns_settings_checkbox' }, 'Import these records into Badger DNS')),
            div(input({ 'class': 'myButton', id: 'next', type: 'submit', value: 'Next' })
          )
        )
      )
    );
  });
};
