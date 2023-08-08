// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use crate::{CpuProfilerConfig, Profiler};
use crate::utils::{convert_svg_to_string, create_file_with_parents};
use std::{thread, time, path::PathBuf};

pub struct CpuProfiler {
    duration: u64,
    frequency: i32,
    cpu_profiling_data_file: PathBuf,
}

impl CpuProfiler {
    pub(crate) fn new(config: &CpuProfilerConfig) -> Self {
        Self {
            duration: config.duration,
            frequency: config.frequency,
            cpu_profiling_data_file: config.cpu_profiling_result.clone(),
        }
    }
}

impl Profiler for CpuProfiler {
    fn start_profiling(&self) -> Result<()> {
        let guard = pprof::ProfilerGuard::new(self.frequency).unwrap();
        thread::sleep(time::Duration::from_secs(self.duration));

        if let Ok(report) = guard.report().build() {
            let file = create_file_with_parents(self.cpu_profiling_data_file.as_path())?;

            report.flamegraph(file).unwrap();
        };
        
        Ok(())
    }
    // End profiling
    fn end_profiling(&self) -> Result<()> {
        
    }
        
    // Expose the results as TXT
    fn expose_text_results(&self) -> Result<String> {
        Ok()
    }

    // Expose the results as SVG
    fn expose_svg_results(&self) -> Result<String> {
        let content = convert_svg_to_string(self.cpu_profiling_data_file.as_path());
        return Ok(content.unwrap());
    }
}


