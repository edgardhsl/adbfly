use crate::domain::entities::{
    DatabaseInfo, FilterInfo, SortInfo, SqlResult, TableData, TableSchema,
};
use crate::infrastructure::sqlite::SqliteRepository;

pub struct DatabaseUseCases {
    repository: SqliteRepository,
}

impl DatabaseUseCases {
    pub fn new() -> Self {
        Self {
            repository: SqliteRepository::new(),
        }
    }

    pub fn list_databases(
        &self,
        device_id: &str,
        package_name: &str,
    ) -> Result<Vec<DatabaseInfo>, String> {
        log::info!(
            "Listing databases for package: {} on device: {}",
            package_name,
            device_id
        );
        let databases = self.repository.list_databases(device_id, package_name)?;
        log::info!("Found {} databases", databases.len());
        Ok(databases)
    }

    pub fn list_tables(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
    ) -> Result<Vec<String>, String> {
        log::info!(
            "Listing tables for database: {} on device: {}",
            db_name,
            device_id
        );
        let tables = self
            .repository
            .list_tables(device_id, package_name, db_name)?;
        log::info!("Found {} tables", tables.len());
        Ok(tables)
    }

    pub fn get_table_schema(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
    ) -> Result<TableSchema, String> {
        log::info!("Getting schema for table: {}", table);
        self.repository
            .get_table_schema(device_id, package_name, db_name, table)
    }

    pub fn get_table_data(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
        page: u32,
        page_size: u32,
        sort: Option<SortInfo>,
        filters: Option<Vec<FilterInfo>>,
    ) -> Result<TableData, String> {
        log::info!(
            "Getting data for table: {} (page: {}, size: {})",
            table,
            page,
            page_size
        );
        self.repository.get_table_data(
            device_id,
            package_name,
            db_name,
            table,
            page,
            page_size,
            sort,
            filters,
        )
    }

    pub fn execute_sql(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        sql: &str,
    ) -> Result<SqlResult, String> {
        log::info!("Executing SQL on table: {}", db_name);
        self.repository
            .execute_sql(device_id, package_name, db_name, sql)
    }
}
