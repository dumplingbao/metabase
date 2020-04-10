import React, { Component } from "react";

import TableInteractiveSummary from "../components/TableInteractiveSummary.jsx";
import TableSimpleSummary from "../components/TableSimpleSummary.jsx";
import { t } from "c-3po";

import ChartSettingsSummaryTableColumns from "metabase/visualizations/components/settings/ChartSettingsSummaryTableColumns.jsx";

import _ from "underscore";
import cx from "classnames";
import RetinaImage from "react-retina-image";

import type { ColumnName, DatasetData } from "metabase/meta/types/Dataset";
import type { Card, VisualizationSettings } from "metabase/meta/types/Card";

import type { RawSeries } from "metabase/meta/types/Visualization";
import type { SummaryTableSettings } from "metabase/meta/types/summary_table";
import {
  enrichSettings,
  settingsAreValid,
} from "metabase/visualizations/lib/settings/summary_table";
import { connect } from "react-redux";
import AtomicQuery from "metabase-lib/lib/queries/AtomicQuery";
import {
  buildResultProvider,
  fetchAggregationsDataBuilder,
} from "metabase/visualizations/lib/summary_table";
import { buildDatasetData } from "metabase/visualizations/lib/summary_table_datasetdata_builder";

type Props = {
  card: Card,
  data: DatasetData,
  rawSeries: RawSeries,
  settings: VisualizationSettings,
  isDashboard: boolean,
  query: AtomicQuery,
  fetchAggregationsData: (SummaryTableSettings, Column[]) => DatasetData[],
};
type State = {
  data: ?DatasetData,
  query: any,
  sort: { [key: ColumnName]: string },
  settings: SummaryTableSettings,
};

export const COLUMNS_SETTINGS = "summaryTable.columns";

const mapDispatchToProps = (dispatch, { card, parameters }) => {
  const fetchAggregationsData = fetchAggregationsDataBuilder(
    dispatch,
    parameters,
  );
  return { fetchAggregationsData };
};

@connect(null, mapDispatchToProps)
export default class SummaryTable extends Component {
  props: Props;
  state: State;

  static uiName = t`特殊表格`;
  static identifier = "summaryTable";
  static iconName = "table";

  static minSize = { width: 4, height: 3 };

  static isSensible(cols, rows) {
    return true;
  }

  static checkRenderable([{ data: { cols, rows } }]) {
    // scalar can always be rendered, nothing needed here
  }

  static settings = {
    [COLUMNS_SETTINGS]: {
      widget: ChartSettingsSummaryTableColumns,
      isValid: ([{ card, data }]) =>
        settingsAreValid(card.visualization_settings[COLUMNS_SETTINGS], data),
      getDefault: ([{ data }]): SummaryTableSettings =>
        enrichSettings(
          null,
          (data || {}).cols || [],
          (data || {}).columns || [],
        ),
      getProps: ([{ data: { columns, cols } }]) => ({
        cols,
        columns,
      }),
    },
    "summaryTable.column_widths": [],
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      data: null,
      query: props.query,
      sort: {},
    };
  }
  // 组件改变，更新数据
  componentWillMount() {
    this._updateData(this.props, this.state.sort);
  }
  // 字段设置改变，更新数据
  async componentWillReceiveProps(newProps: Props) {
    // TODO: remove use of deprecated "card" and "data" props
    if (
      newProps.data !== this.props.data ||
      !_.isEqual(newProps.settings, this.props.settings)
    ) {
      await this._updateData(newProps, this.state.sort);
    }
  }
  // 排序改变，更新数据
  async componentWillUpdate(newProps, nextState) {
    if (nextState.sort !== this.state.sort) {
      await this._updateData(newProps, nextState.sort);
    }
  }
  // 更新排序
  updateSort(columnName: ColumnName) {
    const { settings } = this.props;
    const { sort } = this.state;
    const oldOrder =
      sort[columnName] ||
      getSortOrderFromSettings(settings[COLUMNS_SETTINGS], columnName);
    const newOrder = oldOrder === "asc" ? "desc" : "asc";
    this.setState({ sort: { ...sort, [columnName]: newOrder } });
  }
  // 更新数据
  async _updateData(
    {
      data,
      settings,
      card,
    }: {
      data: DatasetData,
      settings: VisualizationSettings,
    },
    sort,
  ) {
    // let columns = []
    // if(data.cols.length>0){
    //     data.cols.map(item=>{
    //         columns.push(item.name)
    //     })
    // }
    // data.columns = columns
    // 字段设置
    const summarySettings = enrichSettings(
      settings[COLUMNS_SETTINGS],
      data.cols,
      data.columns,
      sort,
    );
    // 汇总数
    const totalsData = await this.props.fetchAggregationsData(
      summarySettings,
      card,
      data.cols,
    );
    // 数据转换
    const resultProvider = buildResultProvider(data, totalsData);
    // 格式化数据
    const reformattedDatasetData = buildDatasetData(
      summarySettings,
      data,
      resultProvider,
    );

    this.setState({
      data: reformattedDatasetData,
      settings: summarySettings,
    });
  }

  render() {
   
    const { isDashboard } = this.props;
    const { data, sort, settings } = this.state;
    const isColumnsDisabled = false;

    //todo:
    // (settings[COLUMNS_SETTINGS] || []).filter(f => f.enabled).length < 1;
    const TableComponent = isDashboard
      ? TableSimpleSummary
      : TableInteractiveSummary;

    if (!data) {
      return null;
    }

    if (isColumnsDisabled) {
      return (
        <div
          className={cx(
            "flex-full px1 pb1 text-centered flex flex-column layout-centered",
            { "text-slate-light": isDashboard, "text-slate": !isDashboard },
          )}
        >
          <RetinaImage
            width={99}
            src="app/assets/img/hidden-field.png"
            forceOriginalDimensions={false}
            className="mb2"
          />
          <span className="h4 text-bold">Every field is hidden right now</span>
        </div>
      );
    } else {
      return (
        <TableComponent
          {...this.props}
          data={data}
          sort={sort}
          summarySettings={settings}
          updateSort={columnName => this.updateSort(columnName)}
        />
      );
    }
  }
}

const getSortOrderFromSettings = (
  setting: SummaryTableSettings,
  columnName: ColumnName,
): string => {
  const columnInfo = setting.columnNameToMetadata[columnName] || {};
  return columnInfo.isAscSortOrder === false ? "desc" : "asc";
};

/**
 * A modified version of TestPopover for Jest/Enzyme tests.
 * It always uses TableSimple which Enzyme is able to render correctly.
 * TableInteractive uses react-virtualized library which requires a real browser viewport.
 */
export const TestTable = (props: Props) => (
  <SummaryTable {...props} isDashboard={true} />
);
TestTable.uiName = SummaryTable.uiName;
TestTable.identifier = SummaryTable.identifier;
TestTable.iconName = SummaryTable.iconName;
TestTable.minSize = SummaryTable.minSize;
TestTable.settings = SummaryTable.settings;
