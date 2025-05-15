import React from 'react';
import './Snow.css';

const Snow = () => {
  // Use Font Awesome snowflake icon
  const snowflakeIcon = <i className="fa-solid fa-snowflake"></i>;
  
  // Create an array of 20 snowflakes
  const snowflakes = Array.from({ length: 20 }, (_, index) => (
    <div key={index} className="snowflake">
      {snowflakeIcon}
    </div>
  ));

  return (
    <div className="purple-snow">
      {snowflakes}
    </div>
  );
};

export default Snow;
