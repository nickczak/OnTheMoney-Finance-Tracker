export type ProjectionInput = {
  initialBalance: number;
  monthlyContribution: number;
  /** Annual return rate in percent, e.g. 7 for 7%. */
  returnRate: number;
  years: number;
  simulations: number;
};

export type Projection = {
  status: string;
  worst10: number;
  median: number;
  best10: number;
  mean: number;
  simulations: number;
  years: number;
  percentiles: number[];
  worst10Trajectory: number[];
  medianTrajectory: number[];
  best10Trajectory: number[];
  meanTrajectory: number[];
};
