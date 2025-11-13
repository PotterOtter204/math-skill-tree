'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import Canvas from './Canvas';
import SkillSidebar from './SkillSidebar';

const CurriculumTree = () => {
	const canvasRef = useRef(null);
	const saveFeedbackTimeoutRef = useRef(null);
	const [isFetchingSkill, setIsFetchingSkill] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveFeedback, setSaveFeedback] = useState(null);
	const [selectedSkill, setSelectedSkill] = useState(null);

	const showSaveFeedback = useCallback((text, tone) => {
		if (saveFeedbackTimeoutRef.current) {
			clearTimeout(saveFeedbackTimeoutRef.current);
		}
		setSaveFeedback({ text, tone });
		saveFeedbackTimeoutRef.current = setTimeout(() => {
			setSaveFeedback(null);
			saveFeedbackTimeoutRef.current = null;
		}, 3000);
	}, []);

	const handleSkillSelect = useCallback((skill) => {
		setSelectedSkill(skill);
	}, []);

	const handleCloseSidebar = useCallback(() => {
		if (canvasRef.current?.clearSelection) {
			canvasRef.current.clearSelection();
		}
		setSelectedSkill(null);
	}, []);

	const handleRemovePrerequisite = useCallback((prereqId) => {
		if (!selectedSkill?.id || !prereqId) {
			return;
		}

		const updateResult = canvasRef.current?.updateSkillNode?.(selectedSkill.id, (node) => ({
			prerequisites: (Array.isArray(node.prerequisites) ? node.prerequisites : []).filter((value) => value !== prereqId),
		}));

		if (!updateResult) {
			return;
		}

		setSelectedSkill((prev) => {
			if (!prev || prev.id !== selectedSkill.id) {
				return prev;
			}
			const nextPrereqs = (Array.isArray(prev.prerequisites) ? prev.prerequisites : []).filter((value) => value !== prereqId);
			return { ...prev, prerequisites: nextPrereqs };
		});
	}, [selectedSkill]);

	const handleAddInstructionalContent = useCallback((entry) => {
		if (!selectedSkill?.id || !entry) {
			return false;
		}

		const title = typeof entry.title === 'string' ? entry.title.trim() : '';
		const content = typeof entry.content === 'string' ? entry.content.trim() : '';

		if (!title || !content) {
			return false;
		}

		const payload = { title, content };
		const updateResult = canvasRef.current?.updateSkillNode?.(selectedSkill.id, (node) => ({
			instructionalContent: [
				...(Array.isArray(node.instructionalContent) ? node.instructionalContent : []),
				payload,
			],
		}));

		if (!updateResult) {
			return false;
		}

		setSelectedSkill((prev) => {
			if (!prev || prev.id !== selectedSkill.id) {
				return prev;
			}
			const existingContent = Array.isArray(prev.instructionalContent) ? prev.instructionalContent : [];
			return { ...prev, instructionalContent: [...existingContent, payload] };
		});

		return true;
	}, [selectedSkill]);

	const handleAddPracticeQuestion = useCallback((entry) => {
		if (!selectedSkill?.id || !entry) {
			return false;
		}

		const title = typeof entry.title === 'string' ? entry.title.trim() : '';
		const content = typeof entry.content === 'string' ? entry.content.trim() : '';

		if (!title || !content) {
			return false;
		}

		const payload = { title, content };
		const updateResult = canvasRef.current?.updateSkillNode?.(selectedSkill.id, (node) => ({
			practiceQuestions: [
				...(Array.isArray(node.practiceQuestions) ? node.practiceQuestions : []),
				payload,
			],
		}));

		if (!updateResult) {
			return false;
		}

		setSelectedSkill((prev) => {
			if (!prev || prev.id !== selectedSkill.id) {
				return prev;
			}
			const existingQuestions = Array.isArray(prev.practiceQuestions) ? prev.practiceQuestions : [];
			return { ...prev, practiceQuestions: [...existingQuestions, payload] };
		});

		return true;
	}, [selectedSkill]);

	const handleAddSkill = useCallback(async () => {
		if (isFetchingSkill) {
			return;
		}

		const canvasApi = canvasRef.current;
		if (!canvasApi?.beginSkillPlacement && !canvasApi?.addSkillNode) {
			showSaveFeedback('Canvas not ready yet.', 'error');
			return;
		}

		setIsFetchingSkill(true);
		let attemptedAutoSave = false;

		try {
			const response = await fetch('/api/get-skills?mode=next', { cache: 'no-store' });
			if (!response.ok) {
				throw new Error(`Failed to retrieve the next skill (${response.status})`);
			}

			const payload = await response.json();
			if (!payload?.skill) {
				showSaveFeedback('All catalogue skills are already on the canvas.', 'success');
				return;
			}

			const { skill, remaining } = payload;

			const placementPayload = {
				id: skill.id,
				skill: skill.skill,
				outcomeCode: skill.outcomeCode,
				outcomeDescription: skill.outcomeDescription,
				width: typeof skill.width === 'number' ? skill.width : undefined,
				height: typeof skill.height === 'number' ? skill.height : undefined,
				prerequisites: Array.isArray(skill.prerequisites) ? skill.prerequisites : [],
				instructionalContent: Array.isArray(skill.instructionalContent) ? skill.instructionalContent : [],
				practiceQuestions: Array.isArray(skill.practiceQuestions) ? skill.practiceQuestions : [],
			};

			if (typeof canvasApi.beginSkillPlacement === 'function') {
				showSaveFeedback(`Click on the canvas to place ${skill.id}.`, 'success');
				await canvasApi.beginSkillPlacement(placementPayload);
			} else {
				canvasApi.addSkillNode(placementPayload);
			}

			await new Promise((resolve) => {
				if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
					window.requestAnimationFrame(() => resolve());
				} else {
					setTimeout(resolve, 0);
				}
			});

			if (canvasApi.saveCanvasState) {
				attemptedAutoSave = true;
				setIsSaving(true);
				const saveResult = await canvasApi.saveCanvasState();
				if (!saveResult?.ok) {
					const message = saveResult?.error?.message ?? 'Failed to persist the new skill.';
					throw new Error(message);
				}

				if (typeof remaining === 'number') {
					const noun = remaining === 1 ? 'skill' : 'skills';
					showSaveFeedback(`Added ${skill.id}. ${remaining} ${noun} remaining.`, 'success');
				} else {
					showSaveFeedback(`Added ${skill.id}.`, 'success');
				}
			} else {
				showSaveFeedback(`Added ${skill.id}. Remember to save your progress.`, 'success');
			}
		} catch (error) {
			console.error('Failed to add skill node.', error);
			const message = error instanceof Error ? error.message : 'Failed to add the next skill.';
			showSaveFeedback(message, 'error');
		} finally {
			if (attemptedAutoSave) {
				setIsSaving(false);
			}
			setIsFetchingSkill(false);
		}
	}, [isFetchingSkill, showSaveFeedback]);

	const handleAddOutcome = useCallback(() => {
		canvasRef.current?.addOutcomeNode({
			id: `custom-outcome-${Date.now()}`,
			text: 'Curriculum Outcome',
			x: 360,
			y: 320,
		});
	}, []);

	const handleSave = useCallback(async () => {
		const canvasApi = canvasRef.current;
		if (!canvasApi?.saveCanvasState) {
			showSaveFeedback('Canvas not ready yet.', 'error');
			return;
		}

		setIsSaving(true);
		const result = await canvasApi.saveCanvasState();
		setIsSaving(false);

		if (result?.ok) {
			showSaveFeedback('Progress saved.', 'success');
		} else {
			const message = result?.error?.message ?? 'Failed to save progress.';
			showSaveFeedback(message, 'error');
		}
	}, [showSaveFeedback]);

	useEffect(() => {
		return () => {
			if (saveFeedbackTimeoutRef.current) {
				clearTimeout(saveFeedbackTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
				<button
					type="button"
					onClick={handleAddSkill}
					disabled={isFetchingSkill || isSaving}
					style={{
						padding: '8px 16px',
						borderRadius: '8px',
						border: '1px solid #1f2933',
						backgroundColor: isFetchingSkill || isSaving ? '#4b5563' : '#1f2933',
						color: '#ffffff',
						cursor: isFetchingSkill || isSaving ? 'not-allowed' : 'pointer',
						opacity: isFetchingSkill || isSaving ? 0.8 : 1,
					}}
				>
					{isFetchingSkill ? 'Adding...' : 'Add Skill Node'}
				</button>
				<button
					type="button"
					onClick={handleAddOutcome}
					style={{
						padding: '8px 16px',
						borderRadius: '8px',
						border: '1px solid #2563eb',
						backgroundColor: '#2563eb',
						color: '#ffffff',
						cursor: 'pointer',
					}}
				>
					Add Outcome Node
				</button>
			
				<button
					type="button"
					onClick={handleSave}
					disabled={isSaving || isFetchingSkill}
					style={{
						padding: '8px 16px',
						borderRadius: '8px',
						border: '1px solid #047857',
						backgroundColor: isSaving || isFetchingSkill ? '#6ee7b7' : '#047857',
						color: '#ffffff',
						cursor: isSaving || isFetchingSkill ? 'not-allowed' : 'pointer',
						opacity: isSaving || isFetchingSkill ? 0.8 : 1,
					}}
				>
					{isSaving ? 'Saving...' : 'Save Progress'}
				</button>
				{saveFeedback && (
					<span
						style={{
							color: saveFeedback.tone === 'error' ? '#f44336' : '#4CAF50',
						}}
					>
						{saveFeedback.text}
					</span>
				)}
			</div>
			<div style={{ flex: 1, position: 'relative' }}>
				<Canvas ref={canvasRef} onSkillSelect={handleSkillSelect} />
				<SkillSidebar
					key={selectedSkill?.id ?? 'sidebar'}
					skill={selectedSkill}
					onClose={handleCloseSidebar}
					onRemovePrerequisite={handleRemovePrerequisite}
					onAddInstructionalContent={handleAddInstructionalContent}
					onAddPracticeQuestion={handleAddPracticeQuestion}
				/>
			</div>
		</div>
	);
};

export default CurriculumTree;

