import React from 'react';
import { DiFirebase, DiReact, DiZend } from 'react-icons/di';
import { Section, SectionDivider, SectionText, SectionTitle } from '../../styles/GlobalComponents';
import { List, ListContainer, ListItem, ListParagraph, ListTitle } from './TechnologiesStyles';

const Technologies = () =>  (
  <Section id='tech'>
    <SectionDivider/>
    <br/>
    <SectionTitle>Technologies</SectionTitle>
    <SectionText>
      This is the tech stack I am most familiar with:
    </SectionText>
    <List>
      <ListItem>
        <DiReact size='3rem'/>
        <ListContainer>
          <ListTitle>Front-End</ListTitle>
          <ListParagraph>
            <br/>
            React.js, JavaScript, HTML, SASS, CSS
          </ListParagraph>
        </ListContainer >
      </ListItem>
      <ListItem>
        <DiFirebase size='3rem'/>
        <ListContainer>
          <ListTitle>Back-End</ListTitle>
          <ListParagraph>
            <br/>
            Node.js, Express.js, MongoDB, MySQL
          </ListParagraph>
        </ListContainer >
      </ListItem>
      {/* <ListItem>
        <DiZend size='3rem'/>
        <ListContainer>
          <ListTitle>Front-End</ListTitle>
          <ListParagraph>
            Experienced with <br/>
            React,js
          </ListParagraph>
        </ListContainer >
      </ListItem> */}

    </List>
  </Section>
);

export default Technologies;
