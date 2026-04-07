use crate::domain::entities::{DatabaseInfo, Device, Package, TableData, TableSchema};

pub trait DeviceRepository: Send + Sync {
    fn list_devices(&self) -> Result<Vec<Device>, String>;
    fn list_packages(&self, device_id: &str) -> Result<Vec<Package>, String>;
}

pub trait DatabaseRepository: Send + Sync {
    fn list_databases(
        &self,
        device_id: &str,
        package_name: &str,
    ) -> Result<Vec<DatabaseInfo>, String>;
    fn list_tables(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
    ) -> Result<Vec<String>, String>;
    fn get_table_schema(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
    ) -> Result<TableSchema, String>;
    fn get_table_data(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        table: &str,
        page: u32,
        page_size: u32,
        sort: Option<crate::domain::entities::SortInfo>,
        filters: Option<Vec<crate::domain::entities::FilterInfo>>,
    ) -> Result<TableData, String>;
    fn execute_sql(
        &self,
        device_id: &str,
        package_name: &str,
        db_name: &str,
        sql: &str,
    ) -> Result<crate::domain::entities::SqlResult, String>;
}
