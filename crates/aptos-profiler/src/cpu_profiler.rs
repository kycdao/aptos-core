// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use crate::{CpuProfilerConfig, Profiler};
use crate::utils::{convert_svg_to_string, create_file_with_parents};
use std::{thread, time, path::PathBuf};

pub struct CpuProfiler {
    duration_secs: u64,
    frequency: i32,
    svg_result_path: PathBuf,
}

impl CpuProfiler {
    pub(crate) fn new(config: &CpuProfilerConfig) -> Self {
        Self {
            duration_secs: config.duration_secs,
            frequency: config.frequency,
            svg_result_path: config.svg_result_path.clone(),
        }
    }
}

impl Profiler for CpuProfiler {
    /// Start CPU profiling
    fn start_profiling(&self) -> Result<()> {
        let guard = pprof::ProfilerGuard::new(self.frequency).unwrap();
        thread::sleep(time::Duration::from_secs(self.duration_secs));

        if let Ok(report) = guard.report().build() {
            let file = create_file_with_parents(self.svg_result_path.as_path())?;

            report.flamegraph(file);
        };
        
        Ok(())
    }

    /// End profiling before given duration
    fn end_profiling(&self) -> Result<()> {
        todo!();
    }
        
    /// Expose the results as TXT
    fn expose_text_results(&self) -> Result<String> {
        unimplemented!();
    }

    /// Expose the results as SVG
    fn expose_svg_results(&self) -> Result<String> {
        let content = convert_svg_to_string(self.svg_result_path.as_path());
        return content;
    }
}

