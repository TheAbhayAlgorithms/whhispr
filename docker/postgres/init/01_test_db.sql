-- docker/postgres/init/01_test_db.sql
-- Creates the test database alongside the main one.
-- This runs automatically on the first container start.
CREATE DATABASE beacon_test OWNER beacon_user;
