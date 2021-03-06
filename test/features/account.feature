Feature: Account
  In order to manage my account
  As a logged-in user
  I want to view and edit profile and setting

  Background:
    Given I logged in with mock data for domains and user info with 35 domain credits and 5 invites available
    And I follow "MY ACCOUNT"

  Scenario: As a logged in user I want to see My Account page
    Then I should see "WHOIS PROFILES"
    And I should see "CREDITS & BILLING"
    And I should see "SETTINGS"
    Then I should see "There's not much to do here yet... maybe give these links a try:"
    And I should see "Whois Profiles"
    And I should see "Credits & Billing"
    And I should see a link with href "#account/profiles"
    And I should see a link with href "#account/billing"

  Scenario: As a logged in user I want to see Whois profiles page
    Then I follow "WHOIS PROFILES"
    And I should see "Create New Profile"
    And I should see "East Agile Company"
    And I should see "tester@eastagile.com"
    And I should see "123456789"
    And I should see "My address"
    And I should see "HCM"
    And I should see "VN"

  Scenario: As a logged in user I want to see Settings page
    Then I follow "SETTINGS"
    And I should see "ACCOUNT SETTINGS"
    And I should see "Change Password"
