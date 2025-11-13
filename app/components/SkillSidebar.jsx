'use client';

import React, { useState } from 'react';

const textInputStyle = {
	width: '100%',
	padding: '8px 10px',
	borderRadius: '6px',
	border: '1px solid #d1d5db',
	backgroundColor: '#f9fafb',
	color: '#111827',
};

const textAreaStyle = {
	...textInputStyle,
	minHeight: '96px',
	resize: 'vertical',
};

const listContainerStyle = {
	display: 'flex',
	flexDirection: 'column',
	gap: '8px',
	margin: 0,
	padding: 0,
	listStyle: 'none',
};

const cardStyle = {
	backgroundColor: '#f3f4f6',
	borderRadius: '8px',
	padding: '10px 12px',
	border: '1px solid #e5e7eb',
	display: 'flex',
	flexDirection: 'column',
	gap: '6px',
};

const sectionTitleStyle = {
	margin: 0,
	fontSize: '16px',
	fontWeight: 600,
	color: '#1f2937',
};

const SkillSidebar = ({
	skill,
	onClose,
	onRemovePrerequisite,
	onAddInstructionalContent,
	onAddPracticeQuestion,
}) => {
	const [instructionTitle, setInstructionTitle] = useState('');
	const [instructionContent, setInstructionContent] = useState('');
	const [practiceTitle, setPracticeTitle] = useState('');
	const [practiceContent, setPracticeContent] = useState('');
	const [instructionError, setInstructionError] = useState(null);
	const [practiceError, setPracticeError] = useState(null);

	const prerequisites = Array.isArray(skill?.prerequisites) ? skill.prerequisites : [];
	const instructionalContent = Array.isArray(skill?.instructionalContent) ? skill.instructionalContent : [];
	const practiceQuestions = Array.isArray(skill?.practiceQuestions) ? skill.practiceQuestions : [];

	if (!skill) {
		return null;
	}

	const handleInstructionSubmit = (event) => {
		event.preventDefault();
		const succeeded = typeof onAddInstructionalContent === 'function'
			? onAddInstructionalContent({ title: instructionTitle, content: instructionContent })
			: false;

		if (succeeded) {
			setInstructionTitle('');
			setInstructionContent('');
			setInstructionError(null);
		} else {
			setInstructionError('Provide both a title and content for the instructional material.');
		}
	};

	const handlePracticeSubmit = (event) => {
		event.preventDefault();
		const succeeded = typeof onAddPracticeQuestion === 'function'
			? onAddPracticeQuestion({ title: practiceTitle, content: practiceContent })
			: false;

		if (succeeded) {
			setPracticeTitle('');
			setPracticeContent('');
			setPracticeError(null);
		} else {
			setPracticeError('Provide both a title and content for the practice question.');
		}
	};

	return (
		<aside
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				height: '100%',
				width: '360px',
				backgroundColor: '#ffffff',
				borderLeft: '1px solid #e5e7eb',
				boxShadow: '-12px 0 30px rgba(15, 23, 42, 0.12)',
				padding: '24px 20px',
				display: 'flex',
				flexDirection: 'column',
				gap: '18px',
				overflowY: 'auto',
				zIndex: 20,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
				<h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Skill Details</h2>
				<button
					type="button"
					onClick={onClose}
					style={{
						padding: '6px 12px',
						borderRadius: '6px',
						border: '1px solid #9ca3af',
						backgroundColor: '#f9fafb',
						color: '#1f2937',
						cursor: 'pointer',
					}}
				>
					Close
				</button>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				<h3 style={sectionTitleStyle}>Overview</h3>
				<div style={cardStyle}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
						<span style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skill</span>
						<strong style={{ fontSize: '16px', color: '#111827' }}>{skill.skill}</strong>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
						<span style={{ fontSize: '13px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outcome</span>
						<span style={{ fontSize: '15px', color: '#1f2937' }}>{`${skill.outcomeCode}${skill.outcomeDescription ? ` · ${skill.outcomeDescription}` : ''}`}</span>
					</div>
				</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
				<h3 style={sectionTitleStyle}>Prerequisites</h3>
				{prerequisites.length === 0 ? (
					<span style={{ color: '#6b7280', fontSize: '14px' }}>No prerequisites assigned.</span>
				) : (
					<ul style={listContainerStyle}>
						{prerequisites.map((prereq) => (
							<li
								key={prereq}
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '8px 12px',
									borderRadius: '6px',
									backgroundColor: '#eef2ff',
									border: '1px solid #c7d2fe',
								}}
							>
								<span style={{ fontSize: '14px', color: '#312e81', marginRight: '12px', overflowWrap: 'anywhere' }}>{prereq}</span>
								<button
									type="button"
									onClick={() => onRemovePrerequisite?.(prereq)}
									style={{
										padding: '4px 8px',
										borderRadius: '4px',
										border: '1px solid #f87171',
										backgroundColor: '#fee2e2',
										color: '#b91c1c',
										cursor: 'pointer',
									}}
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
				<h3 style={sectionTitleStyle}>Instructional Content</h3>
				{instructionalContent.length === 0 ? (
					<span style={{ color: '#6b7280', fontSize: '14px' }}>No instructional content yet.</span>
				) : (
					<ul style={listContainerStyle}>
						{instructionalContent.map((item, index) => (
							<li key={`${item.title}-${index}`} style={cardStyle}>
								<strong style={{ fontSize: '15px', color: '#111827' }}>{item.title}</strong>
								<p style={{ margin: 0, fontSize: '14px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>{item.content}</p>
							</li>
						))}
					</ul>
				)}
				<form onSubmit={handleInstructionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<input
						type="text"
						value={instructionTitle}
						onChange={(event) => {
							setInstructionTitle(event.target.value);
							if (instructionError) {
								setInstructionError(null);
							}
						}}
						placeholder="Instruction title"
						style={textInputStyle}
					/>
					<textarea
						value={instructionContent}
						onChange={(event) => {
							setInstructionContent(event.target.value);
							if (instructionError) {
								setInstructionError(null);
							}
						}}
						placeholder="Instruction content"
						style={textAreaStyle}
					/>
					<button
						type="submit"
						style={{
							padding: '8px 12px',
							borderRadius: '6px',
							border: '1px solid #047857',
							backgroundColor: '#047857',
							color: '#ffffff',
							cursor: 'pointer',
						}}
					>
						Add Instruction
					</button>
					{instructionError && (
						<span style={{ color: '#dc2626', fontSize: '13px' }}>{instructionError}</span>
					)}
				</form>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
				<h3 style={sectionTitleStyle}>Practice Questions</h3>
				{practiceQuestions.length === 0 ? (
					<span style={{ color: '#6b7280', fontSize: '14px' }}>No practice questions yet.</span>
				) : (
					<ul style={listContainerStyle}>
						{practiceQuestions.map((item, index) => (
							<li key={`${item.title}-${index}`} style={cardStyle}>
								<strong style={{ fontSize: '15px', color: '#111827' }}>{item.title}</strong>
								<p style={{ margin: 0, fontSize: '14px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>{item.content}</p>
							</li>
						))}
					</ul>
				)}
				<form onSubmit={handlePracticeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<input
						type="text"
						value={practiceTitle}
						onChange={(event) => {
							setPracticeTitle(event.target.value);
							if (practiceError) {
								setPracticeError(null);
							}
						}}
						placeholder="Question title"
						style={textInputStyle}
					/>
					<textarea
						value={practiceContent}
						onChange={(event) => {
							setPracticeContent(event.target.value);
							if (practiceError) {
								setPracticeError(null);
							}
						}}
						placeholder="Question content"
						style={textAreaStyle}
					/>
					<button
						type="submit"
						style={{
							padding: '8px 12px',
							borderRadius: '6px',
							border: '1px solid #2563eb',
							backgroundColor: '#2563eb',
							color: '#ffffff',
							cursor: 'pointer',
						}}
					>
						Add Practice Question
					</button>
					{practiceError && (
						<span style={{ color: '#dc2626', fontSize: '13px' }}>{practiceError}</span>
					)}
				</form>
			</div>
		</aside>
	);
};

export default SkillSidebar;
