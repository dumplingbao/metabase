import type {
  DatasetData,
  Column,
  ColumnName,
} from "metabase/meta/types/Dataset";
import flatMap from "lodash.flatmap";
import type {
  AggregationKey,
  Dimension,
  QueryPlan,
  ResultProvider,
  SortOrder,
  SummaryRow,
  SummaryTableSettings,
} from "metabase/meta/types/summary_table";
import type { Card, DatasetQuery } from "metabase/meta/types/Card";
import {
  AGGREGATION,
  BREAKOUT,
  shouldTotalizeDefaultBuilder,
} from "metabase/visualizations/lib/settings/summary_table";
import { Set } from "immutable";
import set from "lodash.set";
import get from "lodash.get";
import invert from "lodash.invert";
import isEqual from "lodash.isequal";
import zip from "lodash.zip";
import values from "lodash.values";
import orderBy from "lodash.orderby";
import partition from "lodash.partition";
import {
  fetchDataOrError,
  getDashboardType,
} from "metabase/dashboard/dashboard";
import { applyParameters } from "metabase/meta/Card";
import { EmbedApi, MetabaseApi, PublicApi } from "metabase/services";
import { getParametersBySlug } from "metabase/meta/Parameter";
import { getDashboardComplete } from "metabase/dashboard/selectors";
import { ASC, DESC } from "metabase/meta/types/summary_table";
import type { ClickObject } from "metabase/meta/types/Visualization";

export const grandTotalsLabel = "Grand totals";

export function getTableCellClickedObjectForSummary(
  cols: Column[],
  row: SummaryRow,
  columnIndex: Number,
  valueColumns: ColumnName[],
  colIndexToDimensions: Dimension[][],
): ClickObject {
  const firstPivotValueIndex = cols.findIndex(p =>
    valueColumns.includes(p.name),
  );
  const firstPivotValueIndexCorrected =
    firstPivotValueIndex === -1
      ? Number.MAX_SAFE_INTEGER
      : firstPivotValueIndex;
  const isTotalColumnIndexCorrected = Number.isInteger(row.isTotalColumnIndex)
    ? row.isTotalColumnIndex
    : Number.MAX_SAFE_INTEGER;

  const groupingColumnsCount = Math.min(
    columnIndex,
    firstPivotValueIndexCorrected,
    isTotalColumnIndexCorrected,
  );

  const column = cols[columnIndex];

  const dimensionsFromBreakouts = row
    .slice(0, groupingColumnsCount)
    .map((value, index) => ({ value, column: cols[index] }));
  const dimensionsFromPivot = colIndexToDimensions[columnIndex] || [];

  const dimensions = [...dimensionsFromBreakouts, ...dimensionsFromPivot];

  if (
    Number.isInteger(row.isTotalColumnIndex) ||
    column.source === "aggregation"
  ) {
    return { dimensions };
  }

  const value = row[columnIndex];

  return { value, column, dimensions };
}

const extractNameKind = aggregation => {
  if (aggregation.length === 3 && aggregation[0] === "named") {
    return { name: aggregation[2], kind: aggregation[1][0] };
  }

  if (aggregation.length === 2) {
    return { name: aggregation[0], kind: aggregation[0] };
  }

  return null;
};

const getAggregationTypeBuilder = (
  { dataset_query }: Card,
  cols: Column[],
): (ColumnName => string) => {
  const aggregations =
    (dataset_query && dataset_query.query && dataset_query.query.aggregation) ||
    [];
  const columnNameToAggregation = aggregations
    .map(extractNameKind)
    .filter(p => p)
    .reduce((acc, { name, kind }) => set(acc, name, kind), {});
  return columnName => columnNameToAggregation[columnName] || "sum";
};

export const getAggregationQueries = (
  settings: SummaryTableSettings,
  cols: Column[],
  card: Card,
): DatasetQuery[] => {
  const getAggregationType = getAggregationTypeBuilder(card, cols);

  const nameToTypeMap = getNameToTypeMap(cols);

  const createLiteral = name => ["field-literal", name, nameToTypeMap[name]];
  const createTotal = name => [
    "named",
    [getAggregationType(name), createLiteral(name)],
    name,
  ];

  const canTotalize = shouldTotalizeDefaultBuilder(cols);
  const queryPlan = getQueryPlan(settings, p => canTotalize(p));
  const allKeys = getAllAggregationKeysFlatten(queryPlan);

  return allKeys.map(([groupings, aggregations, sortOrder]) => ({
    aggregation: aggregations.toArray().map(createTotal),
    breakout: groupings.toArray().map(createLiteral),
    "order-by": sortOrder.map(([ascDsc, columnName]) => [
      ascDsc,
      createLiteral(columnName),
    ]),
  }));
};

const getNameToTypeMap = columns => {
  return columns.reduce(
    (acc, column) => ({ ...acc, [column.name]: column.base_type }),
    {},
  );
};

export const createKey = (
  groups: ColumnName[],
  totals: ColumnName[],
  sortOrder: SortOrder[],
): AggregationKey => {
  const groupsSet = Set.of(...groups);
  return [
    groupsSet,
    Set.of(...totals),
    sortOrder.filter(([_, columnName]) => groupsSet.contains(columnName)),
  ];
};

const createKeyFrom = (dataSet: DatasetData) =>
  createKey(
    getColumnNames(dataSet, BREAKOUT),
    getColumnNames(dataSet, AGGREGATION),
    [],
  );

const createValueKey = (groups: ColumnName[]): string =>
  groups.reduce((acc, k) => (acc.length < k.length ? k : acc), "") + "_42";
// 计算结果
const resultsBuilder = ({ cols, columns, rows }: DatasetData) => (
  [groupings, totals]: AggregationKey,
  sortOrder: SortOrder[],
): DatasetData => {
 
//   columns = []
//   if(cols.length>0){
//       cols.map(item=>{
//           columns.push(item.name)
//       })
//   }
  const groupingColumns = cols
    .filter(col => groupings.has(col.name))
    .map(p => ({ ...p, source: BREAKOUT }));
  const totalsColumns = cols
    .filter(col => totals.has(col.name))
    .map(p => ({ ...p, source: AGGREGATION }));

  const columnFromMainResToIndex = invert(columns);

  const groupingIndexes = groupingColumns.map(
    col => columnFromMainResToIndex[col.name],
  );
  const totalsIndexes = totalsColumns.map(
    col => columnFromMainResToIndex[col.name],
  );

  const columnToIndex = invert(groupingColumns.map(p => p.name));

  const rowResRaw = rows.reduce((acc, row) => {
    const rowPrefix = groupingIndexes.map(i => row[i]);
    const path = rowPrefix.toString();

    const values = acc[path] || [];

    const oldIndex = values.findIndex(([prefix, totals]) =>
      isEqual(prefix, rowPrefix),
    );
    const newIndex = oldIndex === -1 ? values.length : oldIndex;

    const oldTotals = get(values, [newIndex, 1], []);
    const toAdd = totalsIndexes.map(i => row[i]);

    const newTotals = zip(oldTotals, toAdd).map(
      ([n1, n2]) => (n1 || n2) && (n1 || 0) + (n2 || 0),
    );

    values[newIndex] = [rowPrefix, newTotals];
    acc[path] = values;

    return acc;
  }, {});

  const newRows = flatMap(values(rowResRaw), p =>
    p.map(([pref, suff]) => [...pref, ...suff]),
  );

  const colsRes = [...groupingColumns, ...totalsColumns];
  const res = {
    cols: colsRes,
    columns: orderBy(
      colsRes.map(p => p.name),
      p => columnFromMainResToIndex[p],
    ),
    rows: orderBy(
      newRows,
      sortOrder.map(([_, columnName]) => columnToIndex[columnName]),
      sortOrder.map(([ascDesc]) => ascDesc),
    ),
  };
  //todo log it

  return res;
};
// 创建结果构造器
const canBuildResultsBuilder = (
  mainResult: DatasetData,
): (AggregationKey => boolean) => {
//   let columns = []
//   if(mainResult.cols.length>0){
//       mainResult.cols.map(item=>{
//           columns.push(item.name)
//       })
//   }
  const canBuildTotals = isSuperset(mainResult.columns);
  const canBuildGroups = isSuperset(mainResult.columns);
  return ([groupings, totals]) =>
    canBuildGroups(groupings) && canBuildTotals(totals);
};
// 判断是分组字段还是聚合字段
const getColumnNames = (dataSet: DatasetData, source: string) =>
  dataSet.cols.filter(p => p.source === source).map(p => p.name);

const isSuperset = (subsetValues: ColumnName[]) => (
  superSet: Set<ColumnName>,
) => superSet.subtract(subsetValues).size === 0;

const shouldSort = (
  defaultSortOrder: SortOrder[],
  expectedSortOrder: SortOrder[],
) => {
  if (!defaultSortOrder) {
    //todo: why defaultSortOrder is null?
    return false;
  }

  const expectedColumns = Set.of(
    ...expectedSortOrder.map(([_, columnName]) => columnName),
  );
  const normalizedDefaultSortOrder = defaultSortOrder.filter(
    ([_, columnName]) => expectedColumns.contains(columnName),
  );

  return !isEqual(normalizedDefaultSortOrder, expectedSortOrder);
};

const sortBuilder = (defaultSortOrder: SortOrder[]) => (
  datasetData: DatasetData,
  expectedSortOrder: SortOrder[],
) => {
  if (!datasetData || !shouldSort(defaultSortOrder, expectedSortOrder)) {
    return datasetData;
  }

  const { cols, columns, rows } = datasetData;
  const columnToIndex = invert(columns);
  return {
    cols,
    columns,
    rows: orderBy(
      rows,
      expectedSortOrder.map(([_, columnName]) => columnToIndex[columnName]),
      expectedSortOrder.map(([ascDesc]) => ascDesc),
    ),
  };
};
// 数据转换
export const buildResultProvider = (
  rawResults: DatasetData,
  totalsSeries: DatasetData[],
  defaultSortOrder: SortOrder[],
): ResultProvider => {
  // 求汇总值,转换创建新集合
  const totalsWithKeys = (totalsSeries || []).map(p => [p, createKeyFrom(p)]);

//   let columns = []
//   if(rawResults.cols.length>0){
//     rawResults.cols.map(item=>{
//         columns.push(item.name)
//     })
//   }

  const valueKey = createValueKey(rawResults.columns);
  // 形成汇总total树
  const totalsLookupTree = totalsWithKeys.reduce(
    (acc, [elem, [gr, unused]]) => set(acc, [...gr, valueKey], elem),
    {},
  );

  const canBuildResults = canBuildResultsBuilder(rawResults);
  const canBeInCache = isSuperset(get(totalsWithKeys, [0, 1])[1]);

  const buildResultsFor = resultsBuilder(rawResults);
  const trySort = sortBuilder(defaultSortOrder);
  
  return (key: AggregationKey): DatasetData => {
    const [groups, aggregations, sortOrder] = key;
    if (canBuildResults(key)) {
      let res;
      if (canBeInCache(aggregations)) {
        res = trySort(get(totalsLookupTree, [...groups, valueKey]), sortOrder);
      }
      return res || buildResultsFor(key, sortOrder);
    }

    throw new Error("InvalidArgumentException - BANG!!!!");
  };
};

export const getQueryPlan = (
  settings: SummaryTableSettings,
  canTotalize: ColumnName => boolean,
): QueryPlan => {
  const [aggregationsList, additionalGroupings] = partition(
    settings.valuesSources,
    canTotalize,
  );
  const aggregations = Set.of(...aggregationsList);
  const subqueriesBreakouts = [
    ...settings.columnsSource,
    ...settings.groupsSources,
  ];
  const allBreakouts = Set.of(...subqueriesBreakouts, ...additionalGroupings);
  const sortOrder = [
    ...settings.groupsSources,
    ...additionalGroupings,
    ...settings.columnsSource,
  ].map(columnName => [
    settings.columnNameToMetadata[columnName].isAscSortOrder ? ASC : DESC,
    columnName,
  ]);

  if (aggregations.size === 0) {
    return { groupings: [[allBreakouts]], aggregations: Set.of() };
  }

  const showTotalsFor = name =>
    (settings.columnNameToMetadata[name] || {}).showTotals;

  const queriesBreakouts = subqueriesBreakouts.reduce(
    ({ acc, prev }, br) => {
      const next = prev.add(br);

      const newAcc = showTotalsFor(br) ? [prev, ...acc] : acc;
      return { acc: newAcc, prev: next };
    },
    { acc: [], prev: Set.of() },
  );

  const breakoutsList = [allBreakouts, ...queriesBreakouts.acc];

  if (!showTotalsFor(settings.columnsSource[0])) {
    return { groupings: breakoutsList.map(p => [p]), aggregations, sortOrder };
  }

  const groupings = breakoutsList
    .slice(0, breakoutsList.length - 1)
    .map(p => [
      p,
      p.filter(
        p =>
          !settings.columnsSource.includes(p) &&
          !additionalGroupings.includes(p),
      ),
    ]);

  return {
    groupings,
    aggregations,
    sortOrder,
  };
};

//todo: move into QueryPlan object
export const getAllQueryKeys = ({
  aggregations,
  groupings,
  sortOrder,
}: QueryPlan): { totals: AggregationKey[][] } =>
  groupings.map(group => group.map(p => createKey(p, aggregations, sortOrder)));

const getAllAggregationKeysFlatten = (qp: QueryPlan): AggregationKey[][] =>
  flatMap(getAllQueryKeys(qp));

const getFetchForDashboard = (dashboard, card, state) => {
  const { parameterValues } = state.dashboard;
  const dashcard = dashboard.ordered_cards.find(c => c.card_id === card.id);
  const dashboardId = dashboard.id;

  const dashboardType = getDashboardType(dashboardId);

  const datasetQuery = applyParameters(
    card,
    dashboard.parameters,
    parameterValues,
    dashcard && dashcard.parameter_mappings,
  );

  if (dashboardType === "public") {
    return sq =>
      fetchDataOrError(
        PublicApi.dashboardCardSuperQuery({
          uuid: dashboardId,
          cardId: card.id,
          "super-query": sq,
          parameters: datasetQuery.parameters
            ? JSON.stringify(datasetQuery.parameters)
            : undefined,
        }),
      );
  } else if (dashboardType === "embed") {
    return sq =>
      fetchDataOrError(
        EmbedApi.dashboardCardSuperQuery({
          token: dashboardId,
          dashcardId: dashcard.id,
          cardId: card.id,
          "super-query": sq,
          parameters: getParametersBySlug(
            dashboard.parameters,
            parameterValues,
          ),
        }),
      );
  } else {
    return sq =>
      fetchDataOrError(
        MetabaseApi.dataset({
          ...datasetQuery,
          "super-query": sq,
        }),
      );
  }
};

const getFetchForQuestion = (card, state, parameters) => {
  const { qb: { parameterValues } } = state;
  const datasetQuery = applyParameters(card, parameters, parameterValues);

  return sq => MetabaseApi.dataset({ ...datasetQuery, "super-query": sq });
};

export const fetchAggregationsDataBuilder = (dispatch, parameters) => (
  settings,
  card,
  cols,
) => {
  return dispatch(async (dispatch, getState) => {
    const state = getState();
    const dashboard = getDashboardComplete(state);
    const fetchSuperQuery = dashboard
      ? getFetchForDashboard(dashboard, card, state)
      : getFetchForQuestion(card, state, parameters);
    const totalsTasks = getAggregationQueries(settings, cols, card).map(
      fetchSuperQuery,
    );
    return [...(await Promise.all(totalsTasks))]
      .map(p => p.data)
      .filter(p => p);
  });
};