/* @flow */

import { drillDownForDimensions } from "metabase/modes/lib/actions";

import type {
  ClickAction,
  ClickActionProps,
} from "metabase/meta/types/Visualization";
import { t } from "ttag";

export default ({
  question,
  clicked,
  settings,
}: ClickActionProps): ClickAction[] => {
  const dimensions = (clicked && clicked.dimensions) || [];
  if (dimensions && dimensions.length == 1) {
    let dimension = dimensions[0];
    if (dimension.column.unit === "day" && dimension.value && dimension.value.length > 10) {
      dimension.value = dimension.value.substring(0,10);
    }
  }
  const drilldown = drillDownForDimensions(dimensions, question.metadata());
  if (!drilldown) {
    return [];
  }

  return [
    {
      name: "timeseries-zoom",
      section: "zoom",
      title: t`Zoom in`,
      question: () => question.pivot(drilldown.breakouts, dimensions),
    },
  ];
};
