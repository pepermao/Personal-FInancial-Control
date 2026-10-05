import { Module } from '@nestjs/common';
import { BenchmarksService } from './benchmarks.service';

@Module({
  providers: [BenchmarksService],
  exports: [BenchmarksService],
})
export class MarketModule {}
