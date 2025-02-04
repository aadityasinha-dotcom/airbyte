import React, { useCallback, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useField } from "formik";
import { components } from "react-select";
import { MenuListComponentProps } from "react-select/src/components/Menu";
import styled from "styled-components";
import { WarningMessage } from "../WarningMessage";

import {
  ControlLabels,
  defaultDataItemSort,
  DropDown,
  DropDownRow,
  ImageBlock,
} from "components";

import { FormBaseItem } from "core/form/types";
import {
  Connector,
  ConnectorDefinition,
  ReleaseStage,
} from "core/domain/connector";

import Instruction from "./Instruction";
import {
  IDataItem,
  IProps as OptionProps,
  OptionView,
} from "components/base/DropDown/components/Option";

const BottomElement = styled.div`
  background: ${(props) => props.theme.greyColro0};
  padding: 6px 16px 8px;
  width: 100%;
  min-height: 34px;
  border-top: 1px solid ${(props) => props.theme.greyColor20};
`;

const Block = styled.div`
  cursor: pointer;
  color: ${({ theme }) => theme.textColor};

  &:hover {
    color: ${({ theme }) => theme.primaryColor};
  }
`;

const Text = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const Label = styled.div`
  margin-left: 13px;
  font-weight: 500;
  font-size: 14px;
  line-height: 17px;
`;

const Stage = styled.div`
  padding: 2px 6px;
  height: 14px;
  background: ${({ theme }) => theme.greyColor20};
  border-radius: 25px;
  text-transform: uppercase;
  font-weight: 500;
  font-size: 8px;
  line-height: 10px;
  color: ${({ theme }) => theme.textColor};
`;

type MenuWithRequestButtonProps = MenuListComponentProps<IDataItem, false>;

const ConnectorList: React.FC<MenuWithRequestButtonProps> = ({
  children,
  ...props
}) => (
  <>
    <components.MenuList {...props}>{children}</components.MenuList>
    <BottomElement>
      <Block
        onClick={props.selectProps.selectProps.onOpenRequestConnectorModal}
      >
        <FormattedMessage id="connector.requestConnectorBlock" />
      </Block>
    </BottomElement>
  </>
);

const Option: React.FC<OptionProps> = (props) => {
  return (
    <components.Option {...props}>
      <OptionView
        data-testid={props.data.label}
        isSelected={props.isSelected}
        isDisabled={props.isDisabled}
      >
        <Text>
          {props.data.img || null}
          <Label>{props.label}</Label>
        </Text>
        {props.data.releaseStage &&
        props.data.releaseStage !== ReleaseStage.GENERALLY_AVAILABLE ? (
          <Stage>
            <FormattedMessage
              id={`connector.releaseStage.${props.data.releaseStage}`}
              defaultMessage={props.data.releaseStage}
            />
          </Stage>
        ) : null}
      </OptionView>
    </components.Option>
  );
};

const ConnectorServiceTypeControl: React.FC<{
  property: FormBaseItem;
  formType: "source" | "destination";
  availableServices: ConnectorDefinition[];
  isEditMode?: boolean;
  documentationUrl?: string;
  allowChangeConnector?: boolean;
  onChangeServiceType?: (id: string) => void;
  onOpenRequestConnectorModal: () => void;
}> = ({
  property,
  formType,
  isEditMode,
  allowChangeConnector,
  onChangeServiceType,
  availableServices,
  documentationUrl,
  onOpenRequestConnectorModal,
}) => {
  const formatMessage = useIntl().formatMessage;
  const [field, fieldMeta, { setValue }] = useField(property.path);

  // TODO Begin hack
  // During the Cloud private beta, we let users pick any connector in our catalog.
  // Later on, we realized we shouldn't have allowed using connectors whose platforms required oauth
  // But by that point, some users were already leveraging them, so removing them would crash the app for users
  // instead we'll filter out those connectors from this drop down menu, and retain them in the backend
  // This way, they will not be available for usage in new connections, but they will be available for users
  // already leveraging them.
  // TODO End hack
  const disallowedOauthConnectors =
    // I would prefer to use windowConfigProvider.cloud but that function is async
    window.CLOUD === "true"
      ? [
          "200330b2-ea62-4d11-ac6d-cfe3e3f8ab2b", // Snapchat
          "2470e835-feaf-4db6-96f3-70fd645acc77", // Salesforce Singer
        ]
      : [];
  const sortedDropDownData = useMemo(
    () =>
      availableServices
        .filter(
          (item) => !disallowedOauthConnectors.includes(Connector.id(item))
        )
        .map((item) => ({
          label: item.name,
          value: Connector.id(item),
          img: <ImageBlock img={item.icon} />,
          releaseStage: item.releaseStage,
        }))
        .sort(defaultDataItemSort),
    [availableServices]
  );

  const selectedService = React.useMemo(
    () => availableServices.find((s) => Connector.id(s) === field.value),
    [field.value, availableServices]
  );

  const handleSelect = useCallback(
    (item: DropDownRow.IDataItem | null) => {
      if (item) {
        setValue(item.value);
        if (onChangeServiceType) {
          onChangeServiceType(item.value);
        }
      }
    },
    [setValue, onChangeServiceType]
  );

  return (
    <>
      <ControlLabels
        label={formatMessage({
          id: `form.${formType}Type`,
        })}
      >
        <DropDown
          {...field}
          components={{
            MenuList: ConnectorList,
            Option,
          }}
          selectProps={{ onOpenRequestConnectorModal }}
          error={!!fieldMeta.error && fieldMeta.touched}
          isDisabled={isEditMode && !allowChangeConnector}
          isSearchable
          placeholder={formatMessage({
            id: "form.selectConnector",
          })}
          options={sortedDropDownData}
          onChange={handleSelect}
        />
      </ControlLabels>
      {selectedService && documentationUrl && (
        <Instruction
          selectedService={selectedService}
          documentationUrl={documentationUrl}
        />
      )}
      {selectedService &&
        (selectedService.releaseStage === ReleaseStage.ALPHA ||
          selectedService.releaseStage === ReleaseStage.BETA) && (
          <WarningMessage stage={selectedService.releaseStage} />
        )}
    </>
  );
};

export { ConnectorServiceTypeControl };
