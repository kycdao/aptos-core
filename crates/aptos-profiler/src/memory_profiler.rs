// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

use anyhow::{anyhow, Result};
use crate::{MemProfilerConfig, Profiler, utils::convert_svg_to_string};
use std::{thread, path::PathBuf, time::Duration, process::Command};

pub struct MemProfiler {
    duration_secs: u64,
    txt_result_path: PathBuf,
    svg_result_path: PathBuf,
}

impl MemProfiler {
    pub(crate) fn new(config: &MemProfilerConfig) -> Self {
        Self {
            duration_secs: config.duration_secs,
            txt_result_path: config.txt_result_path.clone(),
            svg_result_path: config.svg_result_path.clone(),
        }
    }
}

impl Profiler for MemProfiler {
    /// Start memory profiling
    fn start_profiling(&self) -> Result<()> {
        let mut prof_active: bool = true;

        let result = unsafe {
            jemalloc_sys::mallctl(
                b"prof.active\0".as_ptr() as *const _,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut prof_active as *mut _ as *mut _,
                std::mem::size_of::<bool>(),
            )
        };
    
        if result != 0 {
            return Err(anyhow!("Failed to activate jemalloc profiling"));
        }

        thread::sleep(Duration::from_secs(self.duration_secs));
    
        let mut prof_active: bool = false;
        let result = unsafe {
            jemalloc_sys::mallctl(
                b"prof.active\0".as_ptr() as *const _,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut prof_active as *mut _ as *mut _,
                std::mem::size_of::<bool>(),
            )
        };
    
        if result != 0 {
            return Err(anyhow!("Failed to deactivate jemalloc profiling"));
        }

        // TODO: Run jeprof commands from within Rust, current tries give unresolved errors
        Command::new("python3")
            .arg("./crates/aptos-profiler/src/jeprof.py")
            .arg(&self.txt_result_path.to_string_lossy().as_ref())
            .arg(&self.svg_result_path.to_string_lossy().as_ref())
            .output()
            .expect("Failed to execute command");

        Ok(())
    }

    /// End profiling before given duration
    fn end_profiling(&self) -> Result<()> {
        let mut prof_active: bool = false;
        let result = unsafe {
            jemalloc_sys::mallctl(
                b"prof.active\0".as_ptr() as *const _,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut prof_active as *mut _ as *mut _,
                std::mem::size_of::<bool>(),
            )
        };
        
        if result != 0 {
            return Err(anyhow!("Failed to deactivate jemalloc profiling"));
        }
        
        // TODO: Run jeprof commands from within Rust, current tries give unresolved errors
        Command::new("python3")
            .arg("./crates/aptos-profiler/src/jeprof.py")
            .arg(&self.txt_result_path.to_string_lossy().as_ref())
            .arg(&self.svg_result_path.to_string_lossy().as_ref())
            .output()
            .expect("Failed to execute command");
        Ok(())
    }

    /// Expose the results in TXT format
    fn expose_text_results(&self) -> Result<String> {
        let content = convert_svg_to_string(self.txt_result_path.as_path());
        return content;
    }

    /// Expose the results in SVG format
    fn expose_svg_results(&self) -> Result<String> {
        let content = convert_svg_to_string(self.svg_result_path.as_path());
        return content;
    }
}