import { FilterIcon, SortDescendingIcon } from '@heroicons/react/solid';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';
import { IssueResultsResponse } from '../../../server/interfaces/api/issueInterfaces';
import globalMessages from '../../i18n/globalMessages';
import Header from '../Common/Header';
import LoadingSpinner from '../Common/LoadingSpinner';
import PageTitle from '../Common/PageTitle';
import IssueItem from './IssueItem';

const messages = defineMessages({
  issues: 'Issues',
  sortAdded: 'Request Date',
  sortModified: 'Last Modified',
});

enum Filter {
  ALL = 'all',
  OPEN = 'open',
  RESOLVED = 'resolved',
}

type Sort = 'added' | 'modified';

const IssueList: React.FC = () => {
  const intl = useIntl();
  const router = useRouter();
  const [currentFilter, setCurrentFilter] = useState<Filter>(Filter.OPEN);
  const [currentSort, setCurrentSort] = useState<Sort>('added');
  const [currentPageSize /*, setCurrentPageSize*/] = useState<number>(10);

  const page = router.query.page ? Number(router.query.page) : 1;
  const pageIndex = page - 1;
  // const updateQueryParams = useUpdateQueryParams({ page: page.toString() });

  const { data, error } = useSWR<IssueResultsResponse>(
    `/api/v1/issue?take=${currentPageSize}&skip=${
      pageIndex * currentPageSize
    }&filter=${currentFilter}&sort=${currentSort}`
  );

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageTitle title={intl.formatMessage(messages.issues)} />
      <div className="flex flex-col justify-between mb-4 lg:items-end lg:flex-row">
        <Header>Issues</Header>
        <div className="flex flex-col flex-grow mt-2 sm:flex-row lg:flex-grow-0">
          <div className="flex flex-grow mb-2 sm:mb-0 sm:mr-2 lg:flex-grow-0">
            <span className="inline-flex items-center px-3 text-sm text-gray-100 bg-gray-800 border border-r-0 border-gray-500 cursor-default rounded-l-md">
              <FilterIcon className="w-6 h-6" />
            </span>
            <select
              id="filter"
              name="filter"
              onChange={(e) => {
                setCurrentFilter(e.target.value as Filter);
                router.push({
                  pathname: router.pathname,
                  query: router.query.userId
                    ? { userId: router.query.userId }
                    : {},
                });
              }}
              value={currentFilter}
              className="rounded-r-only"
            >
              <option value="all">
                {intl.formatMessage(globalMessages.all)}
              </option>
              <option value="open">
                {intl.formatMessage(globalMessages.open)}
              </option>
              <option value="resolved">
                {intl.formatMessage(globalMessages.resolved)}
              </option>
            </select>
          </div>
          <div className="flex flex-grow mb-2 sm:mb-0 lg:flex-grow-0">
            <span className="inline-flex items-center px-3 text-gray-100 bg-gray-800 border border-r-0 border-gray-500 cursor-default sm:text-sm rounded-l-md">
              <SortDescendingIcon className="w-6 h-6" />
            </span>
            <select
              id="sort"
              name="sort"
              onChange={(e) => {
                setCurrentSort(e.target.value as Sort);
                router.push({
                  pathname: router.pathname,
                  query: router.query.userId
                    ? { userId: router.query.userId }
                    : {},
                });
              }}
              value={currentSort}
              className="rounded-r-only"
            >
              <option value="added">
                {intl.formatMessage(messages.sortAdded)}
              </option>
              <option value="modified">
                {intl.formatMessage(messages.sortModified)}
              </option>
            </select>
          </div>
        </div>
      </div>
      {data.results.map((issue) => {
        return (
          <div className="mb-2" key={`issue-item-${issue.id}`}>
            <IssueItem issue={issue} />
          </div>
        );
      })}
    </>
  );
};

export default IssueList;
