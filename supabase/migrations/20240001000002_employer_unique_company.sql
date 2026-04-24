CREATE UNIQUE INDEX IF NOT EXISTS employer_profiles_company_name_ci
ON employer_profiles (lower(company_name));
