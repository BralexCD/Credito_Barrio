/**
 * Supabase environment configuration.
 *
 * Used to run Angular locally against Supabase Database and Cloudinary.
 *
 * Run with:
 * ng serve -c supabase
 */
export const environment = {
  production: false,

  /**
   * Active data provider.
   */
  dataProvider: 'supabase' as const,

  /**
   * Fallback JSON Server configuration.
   *
   * Keep this temporarily while migrating bounded contexts one by one.
   * Once the whole app uses Supabase, these values can be removed.
   */
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

  /**
   * Supabase Database configuration.
   *
   * Use the Project URL and anon/public key.
   * Do not place the service_role key here.
   */
  supabaseUrl: 'https://rteqhzngwvruqfitjjnq.supabase.co',
  supabasePublishableKey: 'sb_publishable_8lxoYJDDaM4vuD5tZx2-cA_f582ljyY',

  /**
   * Cloudinary configuration.
   *
   * Use an unsigned upload preset for frontend uploads.
   * Do not place Cloudinary API Secret here.
   */
  cloudinaryCloudName: 'su2u7cww',
  cloudinaryUploadPreset: 'credit_drive_unsigned',
  cloudinaryFolder: 'credit-drive/vehicles',
};
