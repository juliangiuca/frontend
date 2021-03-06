Given /^I am not logged in$/ do
  page.execute_script("Badger.logout();")
end

Given /^The home page is fully loaded$/ do
  When 'I wait until xpath "//table/tr[@class=\'table-header\']" is visible'
  When 'I wait until xpath "//table/td" is visible'
  And 'I should not see "Loading domains..."'
end

Given /^A dialog has popped up$/ do
  When 'I wait until "#modal-dialog" is visible'
  When 'I wait until "#modal-content" is visible'
end

Given /^I logged in with mock data for domains and user info with ([^"]*) domain credits and ([^"]*) invites available$/ do |domain_credits, invites_available|
  Given 'I am on the home page'
  And 'I am not logged in'
  Then 'I follow "Login"'
  And "I mock neccessary data to mock login with #{domain_credits} domain credits and #{invites_available} invites available"
  And 'I fill in "email" with "tester@example.com"'
  And 'I fill in "password" with "12345678"'
  And 'I press "Login"'
  And 'I view my domains list'
  And 'The home page is fully loaded'
end

Given /^I mock neccessary data to mock login with ([^"]*) domain credits and ([^"]*) invites available$/ do |domain_credits, invites_available|
  Given 'I mock getDomains with 1 normal domains, 1 in transfer domain and 1 expiring soon domains'
  And "I mock accountInfo with #{domain_credits} domain credits and #{invites_available} invites available"
  And 'I mock getContacts returns 1 contacts'
  And 'I mock getPaymentMethods'
  And 'I mock getInviteStatus with 0 accepted and 0 pending and 0 revoked'
  And 'I mock login'
end
