/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import {Text} from 'react-native';

import {
  openDatabase,
  enablePromise,
  Location,
  SQLiteDatabase,
} from 'react-native-sqlite-storage';
import {sql} from '@kikko-land/query-builder';
import {
  IMigration,
  runQuery,
  IInitDbClientConfig,
  migrationsPlugin,
  reactiveQueriesPlugin,
  IDbBackend,
  IQuery,
  IQueryResult,
  DbProvider,
  EnsureDbLoaded,
} from '@kikko-land/react';
import {Screen} from './components/Screen';

enablePromise(true);

const createNotesTable: IMigration = {
  up: async db => {
    const query = sql`
      CREATE TABLE notes (
        id varchar(20) PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_note_title ON notes(title);
    `;

    await runQuery(db, query);
  },
  id: 1653668686076, // id should be uniq
  name: 'createNotesTable',
};

const reactNativeBackend =
  (initOpts: {
    name: (dbName: string) => string;
    location?: Location;
  }): IDbBackend =>
  ({dbName, stopped$}) => {
    let db: SQLiteDatabase | undefined;

    return {
      async initialize() {
        db = await openDatabase({
          name: initOpts.name(dbName),
          location: initOpts.location,
        });

        stopped$.subscribe(() => {
          if (!db) {
            return;
          }

          db.close();
        });
      },
      async execQueries(
        queries: IQuery[],
        opts: {
          log: {
            suppress: boolean;
            transactionId?: string;
          };
        },
      ): Promise<IQueryResult[]> {
        if (!db) {
          throw new Error(
            `Failed to run queries: ${queries
              .map(q => q.text)
              .join(' ')}, db not initialized`,
          );
        }

        const result: IQueryResult[] = [];

        for (const q of queries) {
          const startTime = new Date().getTime();

          result.push((await db.executeSql(q.text, q.values))[0].rows.raw());

          const end = new Date().getTime();

          if (!opts.log.suppress) {
            console.info(
              `[${dbName}]${
                opts.log.transactionId
                  ? `[tr_id=${opts.log.transactionId.slice(0, 6)}]`
                  : ''
              } ` +
                queries.map(it => it.text).join(' ') +
                ' Time: ' +
                ((end - startTime) / 1000).toFixed(4),
            );
          }
        }

        return result;
      },
    };
  };

const config: IInitDbClientConfig = {
  dbName: 'trong-db',
  dbBackend: reactNativeBackend({name: dbName => `${dbName}.db`}),
  plugins: [
    migrationsPlugin({migrations: [createNotesTable]}),
    reactiveQueriesPlugin(),
  ],
};

const App = () => {
  return (
    <DbProvider config={config}>
      <EnsureDbLoaded fallback={<Text>Loading db...</Text>}>
        <Screen />
      </EnsureDbLoaded>
    </DbProvider>
  );
};

export default App;
