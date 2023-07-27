// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

#![forbid(unsafe_code)]

mod counters;
mod tests;
mod utils;
mod wrappers;

use crate::{
    utils::{set_metrics, NetworkName, TestFailure, TestName, TestResult},
    wrappers::{
        wrapper_cointransfer, wrapper_newaccount, wrapper_nfttransfer, wrapper_publishmodule,
    },
};
use anyhow::Result;
use aptos_logger::{info, Level, Logger};
use aptos_push_metrics::MetricsPusher;
use std::{future::Future, time::{Instant, SystemTime, UNIX_EPOCH}};

// Processes a test result.
async fn process_result<Fut: Future<Output = Result<(), TestFailure>>>(
    test_name: TestName,
    network_name: NetworkName,
    start_time: &str,
    fut: Fut,
) {
    // start timer
    let start = Instant::now();

    // call the flow
    let result = fut.await;

    // end timer
    let time = (Instant::now() - start).as_micros() as f64;

    // process the result
    let output = match result {
        Ok(_) => TestResult::Success,
        Err(failure) => TestResult::from(failure),
    };

    // set metrics and log
    set_metrics(
        &output,
        &test_name.to_string(),
        &network_name.to_string(),
        start_time,
        time,
    );
    info!(
        "{} {} result:{:?} in time:{:?}",
        network_name.to_string(),
        test_name.to_string(),
        output,
        time,
    );
}

async fn test_flows(network_name: NetworkName) -> Result<()> {
    let start_time = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs().to_string();
    info!("testing {} at {}", network_name.to_string(), start_time);

    // Test new account creation and funding
    let test_time = start_time.clone();
    let handle_newaccount = tokio::spawn(async move {
        process_result(
            TestName::NewAccount,
            network_name,
            &test_time,
            wrapper_newaccount(network_name),
        )
        .await;
    });

    // Flow 1: Coin transfer
    let test_time = start_time.clone();
    let handle_cointransfer = tokio::spawn(async move {
        process_result(
            TestName::CoinTransfer,
            network_name,
            &test_time,
            wrapper_cointransfer(network_name),
        )
        .await;
    });

    // Flow 2: NFT transfer
    let test_time = start_time.clone();
    let handle_nfttransfer = tokio::spawn(async move {
        process_result(
            TestName::NftTransfer,
            network_name,
            &test_time,
            wrapper_nfttransfer(network_name),
        )
        .await;
    });

    // Flow 3: Publishing module
    let test_time = start_time.clone();
    process_result(
        TestName::PublishModule,
        network_name,
        &test_time,
        wrapper_publishmodule(network_name),
    )
    .await;

    handle_newaccount.await?;
    handle_cointransfer.await?;
    handle_nfttransfer.await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // log metrics
    Logger::builder().level(Level::Info).build();
    let _mp = MetricsPusher::start_for_local_run("api-tester");

    // test flows
    let _ = test_flows(NetworkName::Testnet).await;
    let _ = test_flows(NetworkName::Devnet).await;

    Ok(())
}
