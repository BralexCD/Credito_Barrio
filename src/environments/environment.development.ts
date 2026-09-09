/**
 * Development environment configuration.
 *
 * Points at the local json-server mock backend.
 */
export const environment = {
  production: false,

  /**
   * Active data provider.
   *
   * json-server: local mock backend.
   * supabase: Supabase PostgreSQL through supabase-js.
   */
  dataProvider: 'json-server' as const,

  // JSON Server API
  platformProviderApiBaseUrl: 'http://localhost:3000/api/v1',

  // IAM
  platformProviderUsersEndpointPath: '/users',
  platformProviderRolesEndpointPath: '/roles',

  // Client Management
  platformProviderClientsEndpointPath: '/clients',

  // Vehicle Management
  platformProviderVehiclesEndpointPath: '/vehicles',
  platformProviderVehicleImagesEndpointPath: '/vehicle_images',

  // Catalogs / configuration
  platformProviderCurrencyCatalogsEndpointPath: '/currency_catalogs',
  platformProviderInsuranceTypesEndpointPath: '/insurance_types',
  platformProviderSettingsEndpointPath: '/settings',

  // Credit Simulation
  platformProviderSimulationsEndpointPath: '/simulations',
  platformProviderInsuranceSimulationsEndpointPath: '/insurance_simulations',
  platformProviderAdditionalExpensesEndpointPath: '/additional_expenses',
  platformProviderPaymentScheduleEndpointPath: '/payment_schedule',
  platformProviderReportsEndpointPath: '/reports',

  // Supabase Database
  supabaseUrl: '',
  supabasePublishableKey: '',

  // Cloudinary
  cloudinaryCloudName: '',
  cloudinaryUploadPreset: '',
  cloudinaryFolder: 'credit-drive/vehicles',
};
