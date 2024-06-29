# @memento-ai/config

## Description
The `@memento-ai/config` package provides functionality for loading and managing configuration settings for the Memento AI application. It allows loading configuration from TOML files and supports merging partial configurations with default values.

## Key Features
- Load configuration from a specific TOML file
- Load a partial configuration and merge it with default values
- Load the default configuration
- Load an aggregate configuration by merging configurations from multiple TOML files in parent directories
- Merge partial configurations into a full configuration
- Load the nearest configuration file in parent directories

## Usage and Examples

### Loading a configuration from a specific TOML file

```typescript
import { loadConfig } from '@memento-ai/config';

const configPath = 'path/to/config.toml';
const config = await loadConfig(configPath);
```

### Loading a partial configuration and merging it with default values

```typescript
import { loadPartialConfig } from '@memento-ai/config';

const partialConfigPath = 'path/to/partial-config.toml';
const partialConfig = await loadPartialConfig(partialConfigPath);
```

### Loading the default configuration

```typescript
import { loadDefaultConfig } from '@memento-ai/config';

const defaultConfig = loadDefaultConfig();
```

### Loading an aggregate configuration

This merges configurations from multiple TOML files in parent directories:

```typescript
import { loadAggregateConfig } from '@memento-ai/config';

const leafPath = 'path/to/leaf/directory';
const aggregateConfig = await loadAggregateConfig(leafPath);
```

### Merging partial configurations into a full configuration

```typescript
import { merge } from '@memento-ai/config';

const fullConfig = { /* ... */ };
const partialConfig = { /* ... */ };
const mergedConfig = merge(fullConfig, partialConfig);
```

### Loading the nearest configuration file

This finds and loads the nearest `memento.toml` file in parent directories:

```typescript
import { loadNearestConfig } from '@memento-ai/config';

const nearestConfig = await loadNearestConfig();
```

The `@memento-ai/config` package provides a flexible and powerful way to manage configuration settings for the Memento AI application, allowing for hierarchical configuration structures and easy merging of partial configurations.
