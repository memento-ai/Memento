# @memento-ai/config
## Description
The `@memento-ai/config` package provides functionality for loading and managing configuration settings for the Memento AI application. It allows loading configuration from TOML files and supports merging partial configurations with default values.
## Key Features
- Load configuration from a specific TOML file
- Load a partial configuration and merge it with default values
- Load the default configuration
- Load an aggregate configuration by merging configurations from multiple TOML files in parent directories
- Merge partial configurations into a full configuration
## Usage and Examples
To load a configuration from a specific TOML file:
```typescript
import { loadConfig } from '@memento-ai/config';

const configPath = 'path/to/config.toml';
const config = await loadConfig(configPath);
```

To load a partial configuration and merge it with default values:
```typescript
import { loadPartialConfig } from '@memento-ai/config';

const partialConfigPath = 'path/to/partial-config.toml';
const partialConfig = await loadPartialConfig(partialConfigPath);
```

To load the default configuration:
```typescript
import { loadDefaultConfig } from '@memento-ai/config';

const defaultConfig = loadDefaultConfig();
```

To load an aggregate configuration by merging configurations from multiple TOML files in parent directories:
```typescript
import { loadAggregateConfig } from '@memento-ai/config';

const leafPath = 'path/to/leaf/directory';
const aggregateConfig = await loadAggregateConfig(leafPath);
```

To merge partial configurations into a full configuration:
```typescript
import { merge } from '@memento-ai/config';

const fullConfig = { /* ... */ };
const partialConfig = { /* ... */ };
const mergedConfig = merge(fullConfig, partialConfig);
```
