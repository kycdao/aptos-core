// Copyright © Aptos Foundation

use crate::{
    consts::FUND_AMOUNT,
    fail_message::{
        ERROR_COULD_NOT_BUILD_PACKAGE, ERROR_COULD_NOT_CREATE_TRANSACTION,
        ERROR_COULD_NOT_FINISH_TRANSACTION, ERROR_COULD_NOT_FUND_ACCOUNT,
        ERROR_COULD_NOT_SERIALIZE, ERROR_NO_BYTECODE, ERROR_NO_MESSAGE, ERROR_NO_METADATA,
        ERROR_NO_MODULE, FAIL_WRONG_MESSAGE, FAIL_WRONG_MODULE,
    },
    persistent_check, time_fn,
    utils::{
        check_balance, create_and_fund_account, emit_step_metrics, get_client, get_faucet_client,
        NetworkName, TestFailure, TestName,
    }, token_client::{build_and_submit_transaction, TransactionOptions},
};
use anyhow::{anyhow, Result};
use aptos_api_types::{HexEncodedBytes, U64};
use aptos_cached_packages::aptos_stdlib::EntryFunctionCall;
use aptos_framework::{BuildOptions, BuiltPackage};
use aptos_logger::info;
use aptos_rest_client::Client;
use aptos_sdk::{
    bcs,
    types::LocalAccount,
};
use aptos_types::{
    account_address::AccountAddress,
    transaction::{EntryFunction, TransactionPayload},
};
use move_core_types::{ident_str, language_storage::ModuleId};
use std::{collections::BTreeMap, path::PathBuf};

static MODULE_NAME: &str = "message";
static MESSAGE: &str = "test message";

/// Tests nft transfer. Checks that:
///   - can publish module
///   - module data exists
///   - can interact with module
///   - interaction is reflected correctly
pub async fn test(network_name: NetworkName, run_id: &str) -> Result<(), TestFailure> {
    // setup
    let (client, mut account) = emit_step_metrics(
        time_fn!(setup, network_name),
        TestName::PublishModule,
        "setup",
        network_name,
        run_id,
    )?;

    // check account data persistently
    emit_step_metrics(
        time_fn!(
            persistent_check::address,
            "check_account_data",
            check_account_data,
            &client,
            account.address()
        ),
        TestName::PublishModule,
        "check_account_data",
        network_name,
        run_id,
    )?;

    // build module
    let package = emit_step_metrics(
        time_fn!(build_module, account.address()),
        TestName::PublishModule,
        "build_module",
        network_name,
        run_id,
    )?;

    // publish module
    let blob = emit_step_metrics(
        time_fn!(publish_module, &client, &mut account, package),
        TestName::PublishModule,
        "publish_module",
        network_name,
        run_id,
    )?;

    // check module data persistently
    emit_step_metrics(
        time_fn!(
            persistent_check::address_bytes,
            "check_module_data",
            check_module_data,
            &client,
            account.address(),
            &blob
        ),
        TestName::PublishModule,
        "check_module_data",
        network_name,
        run_id,
    )?;

    // set message
    emit_step_metrics(
        time_fn!(set_message, &client, &mut account),
        TestName::PublishModule,
        "set_message",
        network_name,
        run_id,
    )?;

    // check message persistently
    emit_step_metrics(
        time_fn!(
            persistent_check::address,
            "check_message",
            check_message,
            &client,
            account.address()
        ),
        TestName::PublishModule,
        "check_message",
        network_name,
        run_id,
    )?;

    Ok(())
}

// Steps

async fn setup(network_name: NetworkName) -> Result<(Client, LocalAccount), TestFailure> {
    // spin up clients
    let client = get_client(network_name);
    let faucet_client = get_faucet_client(network_name);

    // create account
    let account = match create_and_fund_account(&faucet_client).await {
        Ok(account) => account,
        Err(e) => {
            info!(
                "test: publish_module part: setup ERROR: {}, with error {:?}",
                ERROR_COULD_NOT_FUND_ACCOUNT, e
            );
            return Err(e.into());
        },
    };
    info!(
        "test: publish_module part: setup creating account: {}",
        account.address()
    );

    Ok((client, account))
}

async fn check_account_data(client: &Client, account: AccountAddress) -> Result<(), TestFailure> {
    check_balance(TestName::PublishModule, client, account, U64(FUND_AMOUNT)).await?;

    Ok(())
}

async fn build_module(address: AccountAddress) -> Result<BuiltPackage, TestFailure> {
    // get file to compile
    let move_dir = PathBuf::from("./aptos-move/move-examples/hello_blockchain");

    // insert address
    let mut named_addresses: BTreeMap<String, AccountAddress> = BTreeMap::new();
    named_addresses.insert("hello_blockchain".to_string(), address);

    // build options
    let options = BuildOptions {
        named_addresses,
        ..BuildOptions::default()
    };

    // build module
    let package = match BuiltPackage::build(move_dir, options) {
        Ok(package) => package,
        Err(e) => {
            info!(
                "test: publish_module part: publish_module ERROR: {}, with error {:?}",
                ERROR_COULD_NOT_BUILD_PACKAGE, e
            );
            return Err(e.into());
        },
    };

    Ok(package)
}

async fn publish_module(
    client: &Client,
    account: &mut LocalAccount,
    package: BuiltPackage,
) -> Result<HexEncodedBytes, TestFailure> {
    // get bytecode
    let blobs = package.extract_code();

    // get metadata
    let metadata = match package.extract_metadata() {
        Ok(data) => data,
        Err(e) => {
            info!(
                "test: publish_module part: publish_module ERROR: {}, with error {:?}",
                ERROR_NO_METADATA, e
            );
            return Err(e.into());
        },
    };

    // serialize metadata
    let metadata_serialized = match bcs::to_bytes(&metadata) {
        Ok(data) => data,
        Err(e) => {
            info!(
                "test: publish_module part: publish_module ERROR: {}, with error {:?}",
                ERROR_COULD_NOT_SERIALIZE, e
            );
            return Err(anyhow!(e).into());
        },
    };

    // create payload
    let payload: aptos_types::transaction::TransactionPayload =
        EntryFunctionCall::CodePublishPackageTxn {
            metadata_serialized,
            code: blobs.clone(),
        }
        .encode();

    // create transaction
    let pending_txn =
        match build_and_submit_transaction(client, account, payload, TransactionOptions::default())
            .await
        {
            Ok(txn) => txn,
            Err(e) => {
                info!(
                    "test: publish_module part: publish_module ERROR: {}, with error {:?}",
                    ERROR_COULD_NOT_CREATE_TRANSACTION, e
                );
                return Err(e.into());
            },
        };

    // wait for transaction to finish
    if let Err(e) = client.wait_for_transaction(&pending_txn).await {
        info!(
            "test: publish_module part: publish_module ERROR: {}, with error {:?}",
            ERROR_COULD_NOT_FINISH_TRANSACTION, e
        );
        return Err(e.into());
    };

    // get blob for later comparison
    let blob = match blobs.get(0) {
        Some(bytecode) => HexEncodedBytes::from(bytecode.clone()),
        None => {
            info!(
                "test: publish_module part: publish_module ERROR: {}",
                ERROR_NO_BYTECODE
            );
            return Err(anyhow!(ERROR_NO_BYTECODE).into());
        },
    };

    Ok(blob)
}

async fn check_module_data(
    client: &Client,
    address: AccountAddress,
    expected: &HexEncodedBytes,
) -> Result<(), TestFailure> {
    // actual
    let response = match client.get_account_module(address, MODULE_NAME).await {
        Ok(response) => response,
        Err(e) => {
            info!(
                "test: publish_module part: check_module_data ERROR: {}, with error {:?}",
                ERROR_NO_MODULE, e
            );
            return Err(e.into());
        },
    };
    let actual = &response.inner().bytecode;

    // compare
    if expected != actual {
        info!(
            "test: publish_module part: check_module_data FAIL: {}, expected {:?}, got {:?}",
            FAIL_WRONG_MODULE, expected, actual
        );
        return Err(TestFailure::Fail(FAIL_WRONG_MODULE));
    }

    Ok(())
}

async fn set_message(client: &Client, account: &mut LocalAccount) -> Result<(), TestFailure> {
    // set up message
    let message = match bcs::to_bytes(MESSAGE) {
        Ok(data) => data,
        Err(e) => {
            info!(
                "test: publish_module part: set_message ERROR: {}, with error {:?}",
                ERROR_COULD_NOT_SERIALIZE, e
            );
            return Err(anyhow!(e).into());
        },
    };

    // create payload
    let payload = TransactionPayload::EntryFunction(EntryFunction::new(
        ModuleId::new(account.address(), ident_str!(MODULE_NAME).to_owned()),
        ident_str!("set_message").to_owned(),
        vec![],
        vec![message],
    ));

    // create transaction
    let pending_txn =
        match build_and_submit_transaction(client, account, payload, TransactionOptions::default())
            .await
        {
            Ok(txn) => txn,
            Err(e) => {
                info!(
                    "test: publish_module part: set_message ERROR: {}, with error {:?}",
                    ERROR_COULD_NOT_CREATE_TRANSACTION, e
                );
                return Err(e.into());
            },
        };

    // wait for transaction to finish
    if let Err(e) = client.wait_for_transaction(&pending_txn).await {
        info!(
            "test: publish_module part: set_message ERROR: {}, with error {:?}",
            ERROR_COULD_NOT_FINISH_TRANSACTION, e
        );
        return Err(e.into());
    };

    Ok(())
}

async fn check_message(client: &Client, address: AccountAddress) -> Result<(), TestFailure> {
    // expected
    let expected = MESSAGE.to_string();

    // actual
    let actual = match get_message(client, address).await {
        Some(message) => message,
        None => {
            info!(
                "test: publish_module part: check_message ERROR: {}",
                ERROR_NO_MESSAGE
            );
            return Err(anyhow!(ERROR_NO_MESSAGE).into());
        },
    };

    // compare
    if expected != actual {
        info!(
            "test: publish_module part: check_message FAIL: {}, expected {:?}, got {:?}",
            FAIL_WRONG_MESSAGE, expected, actual
        );
        return Err(TestFailure::Fail(FAIL_WRONG_MESSAGE));
    }

    Ok(())
}

// Utils

async fn get_message(client: &Client, address: AccountAddress) -> Option<String> {
    let resource = match client
        .get_account_resource(
            address,
            format!("{}::message::MessageHolder", address.to_hex_literal()).as_str(),
        )
        .await
    {
        Ok(response) => response.into_inner()?,
        Err(_) => return None,
    };

    Some(resource.data.get("message")?.as_str()?.to_owned())
}
