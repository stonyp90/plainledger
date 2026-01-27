/**
 * GraphQL Mutations
 *
 * All GraphQL mutations used by the application.
 */
import { gql } from "@apollo/client";

// =====================================================
// ORGANIZATION MUTATIONS
// =====================================================

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      id
      name
      slug
      industry
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ORGANIZATION = gql`
  mutation UpdateOrganization($input: UpdateOrganizationInput!) {
    updateOrganization(input: $input) {
      id
      name
      slug
      industry
      createdAt
      updatedAt
    }
  }
`;

// =====================================================
// DATA SOURCE MUTATIONS
// =====================================================

export const INITIATE_OAUTH = gql`
  mutation InitiateOAuth($provider: String!, $redirectUri: String) {
    initiateOAuth(provider: $provider, redirectUri: $redirectUri) {
      url
      state
      provider
    }
  }
`;

export const COMPLETE_OAUTH = gql`
  mutation CompleteOAuth($input: OAuthCallbackInput!) {
    completeOAuth(input: $input) {
      id
      provider
      name
      companyName
      status
      createdAt
      updatedAt
    }
  }
`;

export const SYNC_DATA_SOURCE = gql`
  mutation SyncDataSource($id: ID!, $options: SyncOptionsInput) {
    syncDataSource(id: $id, options: $options) {
      success
      stats {
        accountsSynced
        transactionsSynced
        contactsSynced
        invoicesSynced
        billsSynced
      }
      syncedAt
      message
      warnings
    }
  }
`;

export const DISCONNECT_DATA_SOURCE = gql`
  mutation DisconnectDataSource($id: ID!) {
    disconnectDataSource(id: $id) {
      success
      message
      errors
    }
  }
`;

export const DELETE_DATA_SOURCE = gql`
  mutation DeleteDataSource($id: ID!, $confirmDelete: Boolean!) {
    deleteDataSource(id: $id, confirmDelete: $confirmDelete) {
      success
      message
      errors
    }
  }
`;
